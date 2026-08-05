/** @import { RouteId } from '$app/types' */
/** @import { RemoteFunctionDataNode, ServerNodesResponse, ServerRedirectNode } from 'types' */
/** @import { NavigationFinished, NavigationIntent } from './types.js' */
/** @import { CacheEntry } from './remote-functions/cache.svelte.js' */
/** @import { Query } from './remote-functions/query/instance.svelte.js' */
/** @import { LiveQuery } from './remote-functions/query-live/instance.svelte.js' */
import { BROWSER, DEV } from 'esm-env';
import { settled, tick, fork, onMount, hydrate, mount } from 'svelte';
import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { decode_pathname, strip_hash, make_trackable, normalize_path } from '../../utils/url.js';
import { dev_fetch, initial_fetch, lock_fetch, subsequent_fetch, unlock_fetch } from './fetcher.js';
import { parse_routes, parse_server_route } from './parse.js';
import * as storage from './session-storage.js';
import {
	find_anchor,
	resolve_url,
	get_link_info,
	get_router_options,
	is_external_url,
	origin,
	scroll_state,
	load_css
} from './utils.js';
import { base, app_dir, set_match_implementation } from '$app/paths/internal/client';
import * as devalue from 'devalue';
import {
	HISTORY_INFO_KEY,
	HISTORY_METADATA_KEY,
	PRELOAD_PRIORITIES,
	SNAPSHOT_KEY
} from './constants.js';
import { validate_page_exports } from '../../utils/exports.js';
import { noop } from '../../utils/functions.js';
import {
	INVALIDATED_PARAM,
	TRAILING_SLASH_PARAM,
	create_remote_key,
	validate_depends,
	validate_load_response
} from '../shared.js';
import { get_message, get_status } from '../../utils/error.js';
import { page, navigating, updated, notify_version } from './state.svelte.js';
import { payload } from './payload.js';
import {
	add_data_suffix,
	add_resolution_suffix,
	route_id_resolution_pathname
} from '../pathname.js';
import { noop_span } from '../telemetry/noop.js';
import { read_ndjson } from './ndjson.js';
import Root from '../components/root.svelte';
import { Props, RenderNode } from '../props.svelte.js';
import { init_transport, parse, stringify } from '#app/internal/transport';

/**
 * @typedef {{
 *   historyIndex: number;
 *   navigationIndex: number;
 *   pageUrl?: string;
 *   state: string;
 *   persistState: boolean;
 *   resetIndex: number;
 * }} HistoryMetadata
 */

export { load_css };
const ICON_REL_ATTRIBUTES = new Set(['icon', 'shortcut icon', 'apple-touch-icon']);

let errored = false;

/**
 * `reset` functions for `<svelte:boundary>`s in the generated root that have
 * failed. A failed boundary stays failed until `reset()` is called — prop
 * updates alone don't re-render its content — so without resetting, a client
 * navigation away from a render error would leave the stale `+error.svelte`
 * mounted. The boundary's `onerror` populates this array; `navigate` drains it
 * after applying the new props. See sveltejs/kit#15694.
 * @type {Set<() => void>}
 */
const resetters = new Set();

// We track information associated with each history entry in sessionStorage,
// rather than on history.state itself, because when navigation is driven by
// popstate it's too late to access the options or update the focus position associated with the
// state we're navigating from
/**
 * @type {Record<number, { scroll?: { x: number; y: number }; resetIndex?: number }>}
 */
const history_info = storage.get(HISTORY_INFO_KEY) ?? {};

/**
 * navigation index -> any
 * @type {Record<string, any[]>}
 */
const snapshots = storage.get(SNAPSHOT_KEY) ?? {};

/** @type {Props} */
let props;

if (DEV && BROWSER) {
	let warned = false;

	const current_module_url = import.meta.url.split('?')[0]; // remove query params that vite adds to the URL when it is loaded from node_modules

	const warn = () => {
		if (warned) return;

		// Rather than saving a pointer to the original history methods, which would prevent monkeypatching by other libs,
		// inspect the stack trace to see if we're being called from within SvelteKit.
		let stack = new Error().stack?.split('\n');
		if (!stack) return;
		if (!stack[0].includes('https:') && !stack[0].includes('http:')) stack = stack.slice(1); // Chrome includes the error message in the stack

		// skip over `warn` and the place where `warn` was called
		const frame = stack[2];

		// Ignore calls that happen inside dependencies, including SvelteKit.
		// The second condition is only relevant when developing SvelteKit and running it, as there's no node_modules in the stack then (but we still do it to not get repeatedly confused)
		// `frame` can be falsy if we came from an anonymous function
		if (frame?.includes('node_modules') || frame?.includes(current_module_url)) return;

		warned = true;

		console.warn(
			"Avoid using `history.pushState(...)` and `history.replaceState(...)` as these will conflict with SvelteKit's router. Use `goto(...)` from `$app/navigation` instead."
		);
	};

	const push_state = history.pushState;
	history.pushState = (...args) => {
		warn();
		return push_state.apply(history, args);
	};

	const replace_state = history.replaceState;
	history.replaceState = (...args) => {
		warn();
		return replace_state.apply(history, args);
	};
}

/** @param {number} index */
function capture_scroll(index) {
	history_info[index].scroll = scroll_state();
}

/**
 * @param {number} index
 * @param {Pick<HistoryMetadata, 'resetIndex'>} options
 */
function set_history_options(index, options) {
	history_info[index] = {
		...history_info[index],
		resetIndex: options.resetIndex
	};
}

/** @param {boolean} reset */
function blur_active_element(reset) {
	if (
		reset &&
		document.activeElement instanceof HTMLElement &&
		document.activeElement !== document.body
	) {
		document.activeElement.blur();
	}
}

/**
 * @param {URL} url
 * @param {{ x: number; y: number } | null | undefined} scroll
 * @param {boolean} reset
 * @param {Element | null} active_element
 */
function reset_scroll_and_focus(url, scroll, reset, active_element) {
	/** @type {Element | null} */
	let deep_linked = null;

	if (autoscroll) {
		if (scroll) {
			scrollTo(scroll.x, scroll.y);
		} else if ((deep_linked = get_hash_element(url))) {
			deep_linked.scrollIntoView();
		} else {
			scrollTo(0, 0);
		}
	}

	const changed_focus =
		document.activeElement !== active_element && document.activeElement !== document.body;

	if (reset && !changed_focus) {
		reset_focus(url, !deep_linked);
	}

	autoscroll = true;
}

/**
 * @param {number} current_history_index
 * @param {number} current_navigation_index
 */
function clear_onward_history(current_history_index, current_navigation_index) {
	// if we navigated back, then pushed a new state, we can
	// release memory by pruning the scroll/snapshot lookup
	let i = current_history_index + 1;
	while (history_info[i]) {
		delete history_info[i];
		i += 1;
	}

	i = current_navigation_index + 1;
	while (snapshots[i]) {
		delete snapshots[i];
		i += 1;
	}
}

/**
 * Loads `href` the old-fashioned way, with a full page reload.
 * Returns a `Promise` that never resolves (to prevent any
 * subsequent work, e.g. history manipulation, from happening)
 * @param {URL} url
 * @param {boolean} [replace] if `true`, will replace the current `history` entry rather than creating a new one with `pushState`
 * @returns {Promise<any>} a promise that never resolves
 */
function native_navigation(url, replace = false) {
	if (replace) {
		location.replace(url.href);
	} else {
		location.href = url.href;
	}
	return new Promise(noop);
}

/**
 * Checks whether a service worker is registered, and if it is,
 * tries to update it.
 */
async function update_service_worker() {
	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.getRegistration(base || '/');
		if (registration) {
			await registration.update();
		}
	}
}

/** @type {import('types').CSRRoute[]} All routes of the app. Only available when router.resolution=client */
let routes;
/** @type {import('types').CSRPageNodeLoader} */
let default_layout_loader;
/** @type {import('types').CSRPageNodeLoader} */
let default_error_loader;
/** @type {HTMLElement} */
let container;
/** @type {HTMLElement} */
let target;

/** @type {import('./types.js').SvelteKitApp} */
export let app;

/**
 * Data that was serialized during SSR for queries/forms/commands, stored as
 * `{ v }` (value) or `{ e }` (error) nodes so that failed states survive hydration.
 * Entries are deleted as they are consumed (when the corresponding resource is created).
 * @type {Record<string, RemoteFunctionDataNode>}
 */
export const query_responses = {};

/**
 * Data that was serialized during SSR for prerender functions, stored as
 * `{ v }` (value) or `{ e }` (error) nodes.
 * This persists across client-side navigations.
 * @type {Record<string, RemoteFunctionDataNode>}
 */
export const prerender_responses = {};

/** @type {Array<((url: URL) => boolean)>} */
const invalidated = [];

/** @type {{id: string, token: {}, promise: Promise<import('./types.js').NavigationResult>, fork: Promise<import('svelte').Fork | null> | null} | null} */
let load_cache = null;

function discard_load_cache() {
	void load_cache?.fork?.then((f) => f?.discard());
	load_cache = null;
	current_a = { element: undefined, href: undefined };
}

/**
 * @type {Map<string, Promise<URL>>}
 * Cache for client-side rerouting, since it could contain async calls which we want to
 * avoid running multiple times which would slow down navigations (e.g. else preloading
 * wouldn't help because on navigation it would be called again). Since `reroute` should be
 * a pure function (i.e. always return the same) value it's safe to cache across navigations.
 * The server reroute calls don't need to be cached because they are called using `import(...)`
 * which is cached per the JS spec.
 */
const reroute_cache = new Map();

/**
 * Sentinel for a route that exists but has no code to preload, i.e. a `+server.js` with no
 * `+page`. Cached like a parsed route so that repeated `preloadCode(id)` calls for the same
 * id don't re-request it.
 */
const ENDPOINT_ONLY = Symbol('endpoint only');

/**
 * Cache of route ID -> parsed route for server-side route resolution.
 * Populated whenever a server route resolution occurs (`match`, link preloading,
 * hydration), so that `preloadCode(id)` doesn't need an extra server round trip.
 * Lives until full page reload.
 * @type {Map<string, import('types').CSRRoute | typeof ENDPOINT_ONLY>}
 */
const route_id_cache = new Map();

/**
 * Parse a server-provided route and record it in `route_id_cache`, so that a subsequent
 * `preloadCode(id)` for the same route doesn't need another server round trip. Always use
 * this rather than calling `parse_server_route` directly.
 * @param {import('types').CSRRouteServer} server_route
 * @returns {import('types').CSRRoute}
 */
function parse_and_cache_server_route(server_route) {
	const route = parse_server_route(server_route, app.nodes);
	route_id_cache.set(route.id, route);
	return route;
}

/**
 * Note on before_navigate_callbacks, on_navigate_callbacks and after_navigate_callbacks:
 * do not re-assign as some closures keep references to these Sets
 */
/** @type {Set<(navigation: import('@sveltejs/kit').BeforeNavigate) => void>} */
const before_navigate_callbacks = new Set();

/** @type {Set<(navigation: import('@sveltejs/kit').OnNavigate) => import('types').MaybePromise<(() => void) | void>>} */
const on_navigate_callbacks = new Set();

/** @type {Set<(navigation: import('@sveltejs/kit').AfterNavigate) => void>} */
const after_navigate_callbacks = new Set();

/** @type {import('./types.js').NavigationState & { nav: import('@sveltejs/kit').NavigationEvent }} */
let current = {
	branch: [],
	error: null,
	// @ts-ignore - we need the initial value to be null
	url: null,
	// @ts-ignore - we need the initial value to be null
	nav: null
};

/** this being true means we SSR'd */
let hydrated = false;
let started = false;
let autoscroll = true;
let updating = false;
let is_navigating = false;
/** @type {HistoryMetadata | null} */
let hash_navigating = null;
/** True as soon as there happened one client-side navigation (excluding the SvelteKit-initialized initial one when in SPA mode) */
let has_navigated = false;

let force_invalidation = false;

/** @type {number} keeping track of the history index in order to prevent popstate navigation events if needed */
let current_history_index;

/** @type {number} */
let current_navigation_index;

/** @type {number} */
let current_reset_index;

/**
 * @param {any} [state]
 * @returns {HistoryMetadata | undefined}
 */
function get_history_metadata(state = history.state) {
	return state?.[HISTORY_METADATA_KEY];
}

/** @type {{}} Token for the latest navigation. Updated on new navigations */
let navigation_token;

/**
 * @type {{}}
 * The latest invalidate(All) token. Superseeded by both later invalidate(All)s and navigations.
 * This is separate to navigation_token because an invalidate(All) might be triggered while a navigation
 * is in progress, and we want to be able to finish this navigation (unless the invalidation finishes before
 * it and redirects, in which case we will do the redirect triggered by the invalidation).
 */
let invalidation_token;

/**
 * A set of tokens which are associated to current preloads.
 * If a preload becomes a real navigation, it's removed from the set.
 * If a preload token is in the set and the preload errors, the error
 * handling logic (for example reloading) is skipped.
 */
/** @type {Set<{}>} */
const preload_tokens = new Set();

/** @type {Promise<void> | null} */
let pending_invalidate;

/**
 * @type {Map<string, Map<string, CacheEntry<Query<any>>>>}
 * A map of query id -> payload -> query internals for all active queries.
 */
export const query_map = new Map();

/**
 * @type {Map<string, Map<string, CacheEntry<LiveQuery<any>>>>}
 * A map of id -> payload -> live query internals for all active queries.
 */
export const live_query_map = new Map();

set_match_implementation(async (url) => {
	if (typeof url === 'string') {
		url = new URL(url, location.href);
	}

	const intent = await get_navigation_intent(url, false);

	if (intent) {
		return {
			id: /** @type {RouteId} */ (intent.route.id),
			params: intent.params
		};
	}

	return null;
});

let embedded_start = Promise.resolve();

/**
 * TODO this indirection is a grotesque workaround for the fact that multiple apps
 * can operate on the same shared mutable state. This is fundamentally unsound,
 * and the `start`/`_start` distinction does not fix it, but it does get the
 * tests passing. We need to rethink this whole thing but not right now
 * @param {import('./types.js').SvelteKitApp} _app
 * @param {HTMLElement} _target
 * @param {Parameters<typeof _hydrate>[1]} [data]
 */
export function start(_app, _target, data) {
	if (__SVELTEKIT_EMBEDDED__) {
		const start_promise = embedded_start.then(() => _start(_app, _target, data));
		embedded_start = start_promise.catch(noop);
		return start_promise;
	}

	return _start(_app, _target, data);
}

/**
 * @param {import('./types.js').SvelteKitApp} _app
 * @param {HTMLElement} _target
 * @param {Parameters<typeof _hydrate>[1]} [data]
 */
async function _start(_app, _target, data) {
	if (DEV && _target === document.body) {
		console.warn(
			'Placing %sveltekit.body% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed.\n\nConsider wrapping it in an element:\n\n<div style="display: contents">\n  %sveltekit.body%\n</div>'
		);
	}

	if (payload.data) {
		const { q = {}, p = {}, l = {}, f = {} } = payload.data;

		// store the whole nodes — error records seed the corresponding
		// resources in a failed state when they are created during hydration
		for (const k in q) query_responses[k] = q[k];
		for (const k in l) query_responses[k] = l[k];
		for (const k in f) query_responses[k] = f[k];
		for (const k in p) prerender_responses[k] = p[k];
	}

	// detect basic auth credentials in the current URL
	// https://github.com/sveltejs/kit/pull/11179
	// if so, refresh the page without credentials
	if (document.URL !== location.href) {
		// eslint-disable-next-line no-self-assign
		location.href = location.href;
	}

	app = _app;

	init_transport(app.hooks.transport ?? {});

	await _app.hooks.init?.();

	routes = __SVELTEKIT_CLIENT_ROUTING__ ? parse_routes(_app) : [];
	container = __SVELTEKIT_EMBEDDED__ ? _target : document.documentElement;
	target = _target;

	// we import the root layout/error nodes eagerly, so that
	// connectivity errors after initialisation don't nuke the app
	default_layout_loader = _app.nodes[0];
	default_error_loader = _app.nodes[1];

	const [root_layout, root_error] = await Promise.all([
		default_layout_loader(),
		default_error_loader()
	]);

	const tree = new RenderNode(root_layout.component, root_error.component);

	props = new Props({
		page,
		tree,
		form: undefined,
		error: undefined,
		onerror: (_, reset) => resetters.add(reset)
	});

	const history_metadata = get_history_metadata();
	current_history_index = history_metadata?.historyIndex ?? 0;
	current_navigation_index = history_metadata?.navigationIndex ?? 0;
	current_reset_index = history_metadata?.resetIndex ?? 0;

	if (!current_history_index) {
		// we use Date.now() as an offset so that cross-document navigations
		// within the app don't result in data loss
		current_history_index = current_navigation_index = current_reset_index = Date.now();

		// create initial history entry, so we can return here
		history.replaceState(
			{
				...history.state,
				[HISTORY_METADATA_KEY]: {
					historyIndex: current_history_index,
					navigationIndex: current_navigation_index,
					state: stringify({}),
					persistState: false,
					resetIndex: current_history_index
				}
			},
			''
		);
	}

	set_history_options(
		current_history_index,
		/** @type {HistoryMetadata} */ (get_history_metadata())
	);

	// if we reload the page, or Cmd-Shift-T back to it,
	// recover scroll position
	const scroll = history_info[current_history_index]?.scroll;
	function restore_scroll() {
		if (scroll) {
			history.scrollRestoration = 'manual';
			scrollTo(scroll.x, scroll.y);
		}
	}

	if (data) {
		restore_scroll();

		await _hydrate(target, data);
	} else {
		await navigate({
			type: 'enter',
			url: resolve_url(app.hash ? decode_hash(new URL(location.href)) : location.href),
			replace_state: true,
			state: history_metadata?.persistState ? parse(history_metadata.state) : {},
			persist_state: history_metadata?.persistState ?? false
		});

		restore_scroll();
	}

	_start_router();
}

async function _invalidate(reset_page_state = true) {
	// Accept all invalidations as they come, don't swallow any while another invalidation
	// is running because subsequent invalidations may make earlier ones outdated,
	// but batch multiple synchronous invalidations.
	await (pending_invalidate ||= Promise.resolve());
	if (pending_invalidate === null) return;
	pending_invalidate = null;

	const token = (invalidation_token = {});
	const nav_token = navigation_token;
	const navigating = is_navigating;
	const intent = await get_navigation_intent(current.url, true);

	// Clear preload, it might be affected by the invalidation.
	// Also solves an edge case where a preload is triggered, the navigation for it
	// was then triggered and is still running while the invalidation kicks in,
	// at which point the invalidation should take over and "win".
	discard_load_cache();

	// Rerun queries
	/** @type {Map<string, Promise<void>>} */
	const live_query_reconnects = new Map();
	if (force_invalidation) {
		for (const entries of query_map.values()) {
			for (const { resource } of entries.values()) {
				void resource.refresh();
			}
		}

		for (const [query_id, entries] of live_query_map) {
			for (const [payload, { resource }] of entries) {
				const key = create_remote_key(query_id, payload);
				const promise = resource.reconnect();
				promise.catch(noop);
				live_query_reconnects.set(key, promise);
			}
		}
	}

	const prev_state = page.state;
	const prev_shallow = page.shallow;
	const navigation_result = intent && (await load_route(intent));
	if (!navigation_result || token !== invalidation_token || nav_token !== navigation_token) {
		return;
	}

	if (navigation_result.type === 'redirect') {
		return _goto(
			new URL(navigation_result.location, current.url).href,
			{ replace: true },
			1,
			token
		);
	}

	// A navigation started before the invalidation and ended before it finished. The invalidation did not redirect,
	// hence it likely contains outdated data now, so we ignore it.
	if (navigating && !is_navigating) {
		return;
	}

	// Preserve `page.state` when invalidating without resetting it (e.g. `refresh`/`refreshAll`)
	if (!reset_page_state) {
		navigation_result.props.page.state = prev_state;
	}
	navigation_result.props.page.shallow = prev_shallow;
	apply_navigation_result(navigation_result);
	current = { ...navigation_result.state, nav: current.nav };
	reset_invalidation();

	// only wait for promises that are connected to queries that still exist
	/** @type {Promise<any>[]} */
	const promises = [];
	for (const entries of query_map.values()) {
		for (const { resource } of entries.values()) {
			promises.push(resource);
		}
	}
	for (const [query_id, entries] of live_query_map) {
		for (const payload of entries.keys()) {
			const key = create_remote_key(query_id, payload);
			const promise = live_query_reconnects.get(key);
			if (promise) {
				promises.push(promise);
			}
		}
	}

	// Don't use allSettled yet because it's too new
	await Promise.all(promises).catch(noop);
}

function reset_invalidation() {
	invalidated.length = 0;
	force_invalidation = false;
}

/** @param {number} index */
function capture_snapshot(index) {
	if (props.components.some((c) => c?.snapshot)) {
		snapshots[index] = props.components.map((c) => c?.snapshot?.capture());
	}
}

/** @param {number} index */
function restore_snapshot(index) {
	snapshots[index]?.forEach((value, i) => {
		props.components[i]?.snapshot?.restore(value);
	});
}

function persist_state() {
	capture_scroll(current_history_index);
	storage.set(HISTORY_INFO_KEY, history_info);

	capture_snapshot(current_navigation_index);
	storage.set(SNAPSHOT_KEY, snapshots);
}

/**
 * @param {string | URL} url
 * @param {{ type?: import('@sveltejs/kit').NavigationType; replace?: boolean; reset?: boolean; refreshAll?: boolean; invalidate?: Array<string | URL | ((url: URL) => boolean)>; state?: Record<string, any>; persistState?: boolean; event?: Event }} [options]
 * @param {number} [redirect_count]
 * @param {{}} [nav_token]
 * @param {NavigationIntent | undefined} [intent] navigation intent, when already known by the caller (avoids recomputing it)
 * @returns {Promise<void>}
 */
export async function _goto(url, options = {}, redirect_count = 0, nav_token = {}, intent) {
	/** @type {Set<string>} */
	let query_keys;
	/** @type {Set<string>} */
	let live_query_keys;

	// Clear preload cache when refreshAll is true to ensure fresh data
	// after form submissions or explicit invalidations
	if (options.refreshAll) {
		discard_load_cache();
	}

	await navigate({
		type: options.type ?? 'goto',
		url: resolve_url(url),
		reset: options.reset,
		replace_state: options.replace,
		state: options.state,
		persist_state: options.persistState,
		event: options.event,
		redirect_count,
		nav_token,
		intent,
		accept: () => {
			if (options.refreshAll) {
				force_invalidation = true;
				query_keys = new Set();
				for (const [id, entries] of query_map) {
					for (const [payload, entry] of entries) {
						// don't refresh yet, as some queries will be unrendered,
						// but clear caches so that newly rendered queries
						// don't use stale data. TODO same for `live_query_map`
						entry.resource?.reset();
						query_keys.add(create_remote_key(id, payload));
					}
				}
				live_query_keys = new Set();
				for (const [id, entries] of live_query_map) {
					for (const payload of entries.keys()) {
						live_query_keys.add(create_remote_key(id, payload));
					}
				}
			}

			if (options.invalidate) {
				options.invalidate.forEach(push_invalidated);
			}
		}
	});

	if (options.refreshAll) {
		// TODO the ticks shouldn't be necessary, something inside Svelte itself is buggy
		// when a query in a layout that still exists after page change is refreshed earlier than this
		void tick()
			.then(tick)
			.then(() => {
				for (const [id, entries] of query_map) {
					for (const [payload, { resource }] of entries) {
						if (query_keys?.has(create_remote_key(id, payload))) {
							void resource.start();
						}
					}
				}
				for (const [id, entries] of live_query_map) {
					for (const [payload, { resource }] of entries) {
						if (live_query_keys?.has(create_remote_key(id, payload))) {
							void resource.reconnect();
						}
					}
				}
			});
	}
}

/** @param {import('./types.js').NavigationIntent} intent */
async function _preload_data(intent) {
	// Reuse the existing pending preload if it's for the same navigation.
	// Prevents an edge case where same preload is triggered multiple times,
	// then a later one is becoming the real navigation and the preload tokens
	// get out of sync.
	if (intent.id !== load_cache?.id) {
		discard_load_cache();

		const preload = {};
		preload_tokens.add(preload);
		load_cache = {
			id: intent.id,
			token: preload,
			promise: load_route({ ...intent, preload }).finally(() => {
				preload_tokens.delete(preload);
			}),
			fork: null
		};

		load_cache.promise.catch(discard_load_cache);

		if (__SVELTEKIT_FORK_PRELOADS__) {
			const lc = load_cache;

			lc.fork = lc.promise.then((result) => {
				// if load_cache was discarded before load_cache.promise could
				// resolve, bail rather than creating an orphan fork
				if (lc === load_cache && result.type === 'loaded') {
					try {
						return fork(() => {
							apply_navigation_result(result);
						});
					} catch {
						// if it errors, it's because the experimental flag isn't enabled in Svelte
					}
				}

				return null;
			});
		}
	}

	return load_cache.promise;
}

/**
 * Fetch and parse the route with the given ID from the server-side route resolution endpoint.
 * Returns `ENDPOINT_ONLY` if the route exists but has no code to preload, or `undefined` if
 * there is no such route. Only used when `router.resolution === 'server'`.
 * @param {string} id
 * @returns {Promise<import('types').CSRRoute | typeof ENDPOINT_ONLY | undefined>}
 */
async function load_route_by_id(id) {
	/** @type {{ route?: import('types').CSRRouteServer, endpoint_only?: boolean }} */
	let module;

	try {
		module = await import(
			/* @vite-ignore */
			base + route_id_resolution_pathname(app_dir, id)
		);
	} catch {
		// if there's no module at that path the response is a 404 (or, on a static
		// host, fallback HTML with the wrong MIME type) and the import rejects —
		// treat it the same as an unknown route rather than surfacing a cryptic error
		return;
	}

	if (module.endpoint_only) {
		// The route exists, it just has no code to preload.
		route_id_cache.set(id, ENDPOINT_ONLY);
		return ENDPOINT_ONLY;
	}

	if (!module.route) return;

	return parse_and_cache_server_route(module.route);
}

/**
 * Import the modules for a route's layout and leaf nodes, without running `load` functions.
 * @param {import('types').CSRRoute} route
 * @returns {Promise<void>}
 */
async function load_route_nodes(route) {
	await Promise.all(
		/** @type {[has_server_load: boolean, node_loader: import('types').CSRPageNodeLoader][]} */ (
			[...route.layouts, route.leaf].filter(Boolean)
		).map(([, node_loader]) => node_loader())
	);
}

/**
 * @param {URL} url
 * @returns {Promise<void>}
 */
async function _preload_code(url) {
	const route = (await get_navigation_intent(url, false))?.route;

	if (route) {
		await load_route_nodes(route);
	}
}

/**
 * @param {import('./types.js').NavigationFinished} result
 * @param {HTMLElement} target
 * @param {boolean} should_hydrate
 */
async function initialize(result, target, should_hydrate) {
	if (__SVELTEKIT_DEV__ && result.state.error && document.querySelector('vite-error-overlay'))
		return;

	/** @type {import('@sveltejs/kit').NavigationEvent} */
	const nav = {
		params: current.params,
		route: { id: current.route?.id ?? null },
		url: new URL(location.href)
	};

	current = {
		...result.state,
		nav
	};

	// Removes the style node we used to avoid FOUC during development
	if (__SVELTEKIT_DEV__) {
		const style = document.querySelector('style[data-sveltekit]');
		if (style) style.remove();
	}

	apply_navigation_result(result);

	// TODO treeshake `hydrate` in csr mode
	const render = should_hydrate ? hydrate : mount;

	render(Root, {
		target,
		props,
		transformError: /** @param {unknown} e */ async (e) => {
			const error = await handle_error(e, current.nav);
			page.error = error;
			page.status = error.status;
			return error;
		}
	});

	// Wait for a microtask in case svelte experimental async is enabled,
	// which causes component script blocks to run asynchronously
	void (await Promise.resolve());

	if (should_hydrate) {
		/** @type {import('@sveltejs/kit').AfterNavigate} */
		const navigation = {
			from: null,
			to: {
				...nav,
				scroll: history_info[current_history_index]?.scroll ?? scroll_state()
			},
			willUnload: false,
			type: 'enter',
			shallow: false,
			complete: Promise.resolve()
		};

		after_navigate_callbacks.forEach((fn) => fn(navigation));
	}

	restore_snapshot(current_navigation_index);

	started = true;
}

/**
 *
 * @param {{
 *   url: URL;
 *   params: Record<string, string>;
 *   branch: Array<import('./types.js').BranchNode | undefined>;
 *   errors?: Array<import('types').CSRPageNodeLoader | undefined>;
 *   status?: number;
 *   error: App.Error | null;
 *   route: import('types').CSRRoute | null;
 *   form?: Record<string, any> | null;
 * }} opts
 */
async function get_navigation_result_from_branch({
	url,
	params,
	branch,
	errors,
	status,
	error,
	route,
	form
}) {
	/** @type {import('types').TrailingSlash} */
	let slash = 'never';

	// if `paths.base === '/a/b/c`, then the root route is always `/a/b/c/`, regardless of
	// the `trailingSlash` route option, so that relative paths to JS and CSS work
	if (base && (url.pathname === base || url.pathname === base + '/')) {
		slash = 'always';
	} else {
		for (const node of branch) {
			if (node?.slash !== undefined) slash = node.slash;
		}
	}

	url.pathname = normalize_path(url.pathname, slash);
	// eslint-disable-next-line no-self-assign
	url.search = url.search; // turn `/?` into `/`

	/** @type {import('./types.js').NavigationFinished} */
	const result = {
		type: 'loaded',
		state: {
			url,
			params,
			branch,
			error,
			route
		},
		props: {
			page,
			tree: /** @type {RenderNode} */ ({})
		}
	};

	if (error) {
		result.props.error = error;
	}

	if (form !== undefined) {
		result.props.form = form;
	}

	let data = {};
	let data_changed = !page;

	let current_node = result.props.tree;

	/** @type {RenderNode | undefined} */
	let previous_node = props.tree;

	for (let i = 0; i < branch.length; i += 1) {
		const node = branch[i];
		const prev = current.branch[i];

		if (!node) continue;

		if (
			// if an ancestor node in this path changed, `data_changed` is already true and the
			// accumulated `data` differs from the previous render, so we must re-merge
			data_changed ||
			!previous_node ||
			node?.data !== prev?.data
		) {
			current_node.data = { ...data, ...node.data };
			data_changed = true;
		} else {
			// use existing object — prevents effects re-running unnecessarily
			current_node.data = previous_node.data;
		}

		data = current_node.data;

		if (i < branch.length - 1) {
			let next_index = i + 1;
			while (next_index < branch.length && !branch[next_index]) {
				next_index += 1;
			}

			const next = branch[next_index];

			if (next) {
				const error_loader =
					errors?.slice(0, next_index + 1).findLast((x) => x) ?? default_error_loader;

				current_node = current_node.child = new RenderNode(
					next.node.component,
					(await error_loader()).component
				);

				previous_node = previous_node?.child;
			}
		}
	}

	const page_changed =
		!current.url ||
		url.href !== current.url.href ||
		current.error !== error ||
		(form !== undefined && form !== page.form) ||
		data_changed;

	if (page_changed) {
		result.props.page = {
			error,
			params,
			route: {
				id: route?.id ?? null
			},
			state: {},
			shallow: null,
			status: status ?? error?.status ?? 200,
			url: new URL(url),
			form: form ?? null,
			data
		};
	}

	return result;
}

/**
 * Call the universal load function of the given node, if it exists.
 *
 * @param {{
 *   loader: import('types').CSRPageNodeLoader;
 * 	 parent: () => Promise<Record<string, any>>;
 *   url: URL;
 *   params: Record<string, string>;
 *   route: { id: string | null };
 * 	 server_data_node: import('./types.js').DataNode | null;
 * }} options
 * @returns {Promise<import('./types.js').BranchNode>}
 */
async function load_node({ loader, parent, url, params, route, server_data_node }) {
	/** @type {Record<string, any> | null} */
	let data = null;

	let is_tracking = true;

	/** @type {import('types').Uses} */
	const uses = {
		dependencies: new Set(),
		params: new Set(),
		parent: false,
		route: false,
		url: false,
		search_params: new Set()
	};

	const node = await loader();

	if (DEV) {
		validate_page_exports(node.universal);

		if (node.universal && app.hash) {
			const options = Object.keys(node.universal).filter((o) => o !== 'load');

			if (options.length > 0) {
				throw new Error(
					`Page options are ignored when \`router.type === 'hash'\` (${route.id} has ${options
						.filter((o) => o !== 'load')
						.map((o) => `'${o}'`)
						.join(', ')})`
				);
			}
		}
	}

	if (__SVELTEKIT_HAS_UNIVERSAL_LOAD__ && node.universal?.load) {
		/** @param {string[]} deps */
		function depends(...deps) {
			for (const dep of deps) {
				if (DEV) validate_depends(/** @type {string} */ (route.id), dep);

				const { href } = new URL(dep, url);
				uses.dependencies.add(href);
			}
		}

		/** @type {import('@sveltejs/kit').LoadEvent} */
		const load_input = {
			tracing: { enabled: false, root: noop_span, current: noop_span },
			route: new Proxy(route, {
				get: (target, key) => {
					if (is_tracking) {
						uses.route = true;
					}
					return target[/** @type {'id'} */ (key)];
				}
			}),
			params: new Proxy(params, {
				get: (target, key) => {
					if (is_tracking) {
						uses.params.add(/** @type {string} */ (key));
					}
					return target[/** @type {string} */ (key)];
				}
			}),
			data: server_data_node?.data ?? null,
			url: make_trackable(
				url,
				() => {
					if (is_tracking) {
						uses.url = true;
					}
				},
				(param) => {
					if (is_tracking) {
						uses.search_params.add(param);
					}
				},
				app.hash
			),
			async fetch(resource, init) {
				if (resource instanceof Request) {
					// we're not allowed to modify the received `Request` object, so in order
					// to fixup relative urls we create a new equivalent `init` object instead
					init = {
						// the request body must be consumed in memory until browsers
						// implement streaming request bodies and/or the body getter
						body:
							resource.method === 'GET' || resource.method === 'HEAD'
								? undefined
								: await resource.blob(),
						cache: resource.cache,
						credentials: resource.credentials,
						// the server sets headers to `undefined` if there are no headers but
						// the client defaults to an empty Headers object in the Request object.
						// To keep the two values in sync, we explicitly set the headers to `undefined`.
						// Also, not sure why, but sometimes 0 is evaluated as truthy so we need to
						// explicitly compare the headers length to a number here
						headers: [...resource.headers].length > 0 ? resource?.headers : undefined,
						integrity: resource.integrity,
						keepalive: resource.keepalive,
						method: resource.method,
						mode: resource.mode,
						redirect: resource.redirect,
						referrer: resource.referrer,
						referrerPolicy: resource.referrerPolicy,
						signal: resource.signal,
						...init
					};
				}

				const { resolved, promise } = resolve_fetch_url(resource, init, url);

				if (is_tracking) {
					depends(resolved.href);
				}

				return promise;
			},
			setHeaders: noop,
			depends,
			parent() {
				if (is_tracking) {
					uses.parent = true;
				}
				return parent();
			},
			untrack(fn) {
				is_tracking = false;
				try {
					return fn();
				} finally {
					is_tracking = true;
				}
			}
		};

		if (DEV) {
			try {
				lock_fetch();
				data = (await node.universal.load.call(null, load_input)) ?? null;
				validate_load_response(data, `related to route '${route.id}'`);
			} finally {
				unlock_fetch();
			}
		} else {
			data = (await node.universal.load.call(null, load_input)) ?? null;
		}
	}

	return {
		node,
		loader,
		server: server_data_node,
		universal: node.universal?.load ? { type: 'data', data, uses } : null,
		data: data ?? server_data_node?.data ?? null,
		slash: node.universal?.trailingSlash ?? server_data_node?.slash
	};
}

/**
 * @param {Request | string | URL} input
 * @param {RequestInit | undefined} init
 * @param {URL} url
 */
function resolve_fetch_url(input, init, url) {
	let requested = input instanceof Request ? input.url : input;

	// we must fixup relative urls so they are resolved from the target page
	const resolved = new URL(requested, url);

	// match ssr serialized data url, which is important to find cached responses
	if (resolved.origin === url.origin) {
		requested = resolved.href.slice(url.origin.length);
	}

	// prerendered pages may be served from any origin, so `initial_fetch` urls shouldn't be resolved
	const promise = started
		? subsequent_fetch(requested, resolved.href, init)
		: initial_fetch(requested, init);

	return { resolved, promise };
}

/**
 * @param {boolean} parent_changed
 * @param {boolean} route_changed
 * @param {boolean} url_changed
 * @param {Set<string>} search_params_changed
 * @param {import('types').Uses | undefined} uses
 * @param {Record<string, string>} params
 */
function has_changed(
	parent_changed,
	route_changed,
	url_changed,
	search_params_changed,
	uses,
	params
) {
	if (force_invalidation) return true;

	if (!uses) return false;

	if (uses.parent && parent_changed) return true;
	if (uses.route && route_changed) return true;
	if (uses.url && url_changed) return true;

	for (const tracked_params of uses.search_params) {
		if (search_params_changed.has(tracked_params)) return true;
	}

	for (const param of uses.params) {
		if (params[param] !== current.params[param]) return true;
	}

	for (const href of uses.dependencies) {
		if (invalidated.some((fn) => fn(new URL(href)))) return true;
	}

	return false;
}

/**
 * @param {import('types').ServerDataNode | import('types').ServerDataSkippedNode | null} node
 * @param {import('./types.js').DataNode | null} [previous]
 * @returns {import('./types.js').DataNode | null}
 */
function create_data_node(node, previous) {
	if (node?.type === 'data') return node;
	if (node?.type === 'skip') return previous ?? null;
	return null;
}

/**
 * @param {URL | null} old_url
 * @param {URL} new_url
 */
function diff_search_params(old_url, new_url) {
	if (!old_url) return new Set(new_url.searchParams.keys());

	const changed = new Set([...old_url.searchParams.keys(), ...new_url.searchParams.keys()]);

	for (const key of changed) {
		const old_values = old_url.searchParams.getAll(key);
		const new_values = new_url.searchParams.getAll(key);

		if (
			old_values.every((value) => new_values.includes(value)) &&
			new_values.every((value) => old_values.includes(value))
		) {
			changed.delete(key);
		}
	}

	return changed;
}

/**
 * @overload
 * @param {import('./types.js').NavigationIntent} intent
 * @returns {Promise<import('./types.js').NavigationResult | undefined>}
 */
/**
 * @overload
 * @param {import('./types.js').NavigationIntent & { preload: {} }} intent
 * @returns {Promise<import('./types.js').NavigationResult>}
 */
/**
 * @param {import('./types.js').NavigationIntent & { preload?: {} }} intent
 * @returns {Promise<import('./types.js').NavigationResult | undefined>}
 */
async function load_route({ id, invalidating, url, params, route, preload }) {
	if (load_cache?.id === id) {
		// the preload becomes the real navigation
		preload_tokens.delete(load_cache.token);
		return load_cache.promise;
	}

	const { errors, layouts, leaf } = route;

	const loaders = [...layouts, leaf];

	// preload modules to avoid waterfall, but handle rejections
	// so they don't get reported to Sentry et al (we don't need
	// to act on the failures at this point)
	errors.forEach((loader) => loader?.().catch(noop));
	loaders.forEach((loader) => loader?.[1]().catch(noop));

	/** @type {import('types').ServerNodesResponse | import('types').ServerRedirectNode | null} */
	let server_data = null;
	const url_changed = current.url ? id !== get_page_key(current.url) : false;
	// current.route is null after an error-page render, so a missing route counts as changed
	const route_changed = !current.route || route.id !== current.route.id;
	const search_params_changed = diff_search_params(current.url, url);

	let parent_invalid = false;

	if (__SVELTEKIT_HAS_SERVER_LOAD__) {
		const invalid_server_nodes = loaders.map((loader, i) => {
			const previous = current.branch[i];

			const invalid =
				!!loader?.[0] &&
				(previous?.loader !== loader[1] ||
					has_changed(
						parent_invalid,
						route_changed,
						url_changed,
						search_params_changed,
						previous.server?.uses,
						params
					));

			if (invalid) {
				// For the next one
				parent_invalid = true;
			}

			return invalid;
		});

		if (invalid_server_nodes.some(Boolean)) {
			try {
				server_data = await load_data(url, invalid_server_nodes);
			} catch (error) {
				const handled_error = await handle_error(error, { url, params, route: { id } });

				if (preload && preload_tokens.has(preload)) {
					throw handled_error;
				}

				return load_root_error_page({
					error: handled_error,
					url,
					route
				});
			}

			if (server_data.type === 'redirect') {
				return server_data;
			}
		}
	}

	const server_data_nodes = server_data?.nodes;

	let parent_changed = false;

	const branch_promises = loaders.map(async (loader, i) => {
		if (!loader) return;

		/** @type {import('./types.js').BranchNode | undefined} */
		const previous = current.branch[i];

		const server_data_node = server_data_nodes?.[i];

		// reuse data from previous load if it's still valid
		const valid =
			(!server_data_node || server_data_node.type === 'skip') &&
			loader[1] === previous?.loader &&
			!has_changed(
				parent_changed,
				route_changed,
				url_changed,
				search_params_changed,
				previous.universal?.uses,
				params
			);
		if (valid) return previous;

		parent_changed = true;

		if (server_data_node?.type === 'error') {
			// rethrow and catch below
			throw new HttpError(server_data_node.error);
		}

		return load_node({
			loader: loader[1],
			url,
			params,
			route,
			parent: async () => {
				const data = {};
				for (let j = 0; j < i; j += 1) {
					Object.assign(data, (await branch_promises[j])?.data);
				}
				return data;
			},
			server_data_node: create_data_node(
				// server_data_node is undefined if it wasn't reloaded from the server;
				// and if current loader uses server data, we want to reuse previous data.
				server_data_node === undefined && loader[0] ? { type: 'skip' } : (server_data_node ?? null),
				loader[0] ? previous?.server : undefined
			)
		});
	});

	// if we don't do this, rejections will be unhandled
	for (const p of branch_promises) p.catch(noop);

	/** @type {Array<import('./types.js').BranchNode | undefined>} */
	const branch = [];

	for (let i = 0; i < loaders.length; i += 1) {
		if (loaders[i]) {
			try {
				branch.push(await branch_promises[i]);
			} catch (err) {
				if (err instanceof Redirect) {
					return {
						type: 'redirect',
						status: err.status,
						location: err.location
					};
				}

				if (preload && preload_tokens.has(preload)) {
					throw await handle_error(err, { params, url, route: { id: route.id } });
				}

				/** @type {App.Error} */
				let error;

				if (server_data_nodes?.includes(/** @type {import('types').ServerErrorNode} */ (err))) {
					// this is the server error rethrown above, reconstruct but don't invoke
					// the client error handler; it should've already been handled on the server
					error = /** @type {import('types').ServerErrorNode} */ (err).error;
				} else if (err instanceof HttpError) {
					error = err.body;
				} else {
					// Referenced node could have been removed due to redeploy, check
					if (await updated.check()) {
						// Before reloading, try to update the service worker if it exists
						await update_service_worker();
						return await native_navigation(url);
					}

					error = await handle_error(err, { params, url, route: { id: route.id } });
				}

				const error_load = await load_nearest_error_page(i, branch, errors);
				if (error_load) {
					return get_navigation_result_from_branch({
						url,
						params,
						branch: branch.slice(0, error_load.idx).concat(error_load.node),
						errors,
						error,
						route
					});
				} else {
					return await server_fallback(url, { id: route.id }, error);
				}
			}
		} else {
			// push an empty slot so we can rewind past gaps to the
			// layout that corresponds with an +error.svelte page
			branch.push(undefined);
		}
	}

	return get_navigation_result_from_branch({
		url,
		params,
		branch,
		errors,
		error: null,
		route,
		// Reset `form` on navigation, but not invalidation
		form: invalidating ? undefined : null
	});
}

/**
 * @param {number} i Start index to backtrack from
 * @param {Array<import('./types.js').BranchNode | undefined>} branch Branch to backtrack
 * @param {Array<import('types').CSRPageNodeLoader | undefined>} errors All error pages for this branch
 * @returns {Promise<{idx: number; node: import('./types.js').BranchNode} | undefined>}
 */
async function load_nearest_error_page(i, branch, errors) {
	while (i--) {
		if (errors[i]) {
			let j = i;
			while (!branch[j]) j -= 1;
			try {
				return {
					idx: j + 1,
					node: {
						node: await /** @type {import('types').CSRPageNodeLoader } */ (errors[i])(),
						loader: /** @type {import('types').CSRPageNodeLoader } */ (errors[i]),
						data: {},
						server: null,
						universal: null
					}
				};
			} catch {
				continue;
			}
		}
	}
}

/**
 * @param {{
 *   error: App.Error;
 *   url: URL;
 *   route: { id: string | null }
 * }} opts
 * @returns {Promise<import('./types.js').NavigationFinished | undefined>} returns `undefined` in case of a redirect
 */
async function load_root_error_page({ error, url, route }) {
	/** @type {Record<string, string>} */
	const params = {}; // error page does not have params

	/** @type {import('types').ServerDataNode | null} */
	let server_data_node = null;

	if (__SVELTEKIT_HAS_SERVER_LOAD__) {
		const default_layout_has_server_load = app.server_loads[0] === 0;

		if (default_layout_has_server_load) {
			// TODO post-https://github.com/sveltejs/kit/discussions/6124 we can use
			// existing root layout data
			try {
				const server_data = await load_data(url, [true]);

				if (
					server_data.type !== 'data' ||
					(server_data.nodes[0] && server_data.nodes[0].type !== 'data')
				) {
					throw 0;
				}

				server_data_node = server_data.nodes[0] ?? null;
			} catch (e) {
				// at this point we have no choice but to fall back to the server, if it wouldn't
				// bring us right back here, turning this into an endless loop.
				// if __data.json returned 404, the route doesn't exist — don't reload or we loop
				if (
					!(e instanceof HttpError && e.status === 404) &&
					(url.origin !== origin || url.pathname !== location.pathname || hydrated)
				) {
					return await native_navigation(url);
				}
			}
		}
	}

	try {
		const root_layout = await load_node({
			loader: default_layout_loader,
			url,
			params,
			route,
			parent: () => Promise.resolve({}),
			server_data_node: create_data_node(server_data_node)
		});

		/** @type {import('./types.js').BranchNode} */
		const root_error = {
			node: await default_error_loader(),
			loader: default_error_loader,
			universal: null,
			server: null,
			data: null
		};

		return get_navigation_result_from_branch({
			url,
			params,
			branch: [root_layout, root_error],
			error,
			errors: [],
			route: null
		});
	} catch (error) {
		// client-side navigation if the root layout loader throws a redirect while
		// rendering the default error page
		if (error instanceof Redirect) {
			await _goto(new URL(error.location, location.href));
			return;
		}

		// otherwise, render the static error page
		const error_template = await app.get_error_template();
		const handled = await handle_error(error, { url, params, route });
		const message = String(handled?.message ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		const html = error_template({ status: handled.status, message });
		const parsed = new DOMParser().parseFromString(html, 'text/html');
		document.documentElement.replaceChild(document.adoptNode(parsed.head), document.head);
		document.documentElement.replaceChild(document.adoptNode(parsed.body), document.body);

		throw error;
	}
}

/**
 * Resolve the relative rerouted URL for a client-side navigation
 * @param {URL} url
 * @returns {Promise<URL | undefined>}
 */
async function get_rerouted_url(url) {
	const href = url.href;

	if (reroute_cache.has(href)) {
		return reroute_cache.get(href);
	}

	let rerouted;

	try {
		const promise = (async () => {
			// reroute could alter the given URL, so we pass a copy
			let rerouted =
				(await app.hooks.reroute({
					url: new URL(url),
					fetch: async (input, init) => {
						return resolve_fetch_url(input, init, url).promise;
					}
				})) ?? url;

			if (typeof rerouted === 'string') {
				const tmp = new URL(url); // do not mutate the incoming URL

				if (app.hash) {
					tmp.hash = rerouted;
				} else {
					tmp.pathname = rerouted;
				}

				rerouted = tmp;
			}

			return rerouted;
		})();

		reroute_cache.set(href, promise);
		rerouted = await promise;
	} catch (e) {
		reroute_cache.delete(href);
		if (DEV) {
			// in development, print the error...
			console.error(e);

			// ...and pause execution, since otherwise we will immediately reload the page
			debugger; // eslint-disable-line
		}

		// fall back to native navigation
		return;
	}

	return rerouted;
}

/**
 * Resolve the full info (which route, params, etc.) for a client-side navigation from the URL,
 * taking the reroute hook into account. If this isn't a client-side-navigation (or the URL is undefined),
 * returns undefined.
 * @param {URL | undefined} url
 * @param {boolean} invalidating
 * @returns {Promise<import('./types.js').NavigationIntent | undefined>}
 */
export async function get_navigation_intent(url, invalidating) {
	if (!url) return;
	if (is_external_url(url, base, app.hash)) return;

	if (__SVELTEKIT_CLIENT_ROUTING__) {
		const rerouted = await get_rerouted_url(url);
		if (!rerouted) return;

		const path = get_url_path(rerouted);

		for (const route of routes) {
			const params = route.exec(path);

			if (params) {
				return {
					id: get_page_key(url),
					invalidating,
					route,
					params,
					url
				};
			}
		}
	} else {
		/** @type {{ route?: import('types').CSRRouteServer, params: Record<string, string>}} */
		const { route, params } = await import(
			/* @vite-ignore */
			add_resolution_suffix(url.pathname)
		);

		if (!route) return;

		return {
			id: get_page_key(url),
			invalidating,
			route: parse_and_cache_server_route(route),
			params,
			url
		};
	}
}

/** @param {URL} url */
function get_url_path(url) {
	return (
		decode_pathname(
			app.hash ? url.hash.replace(/^#/, '').replace(/[?#].+/, '') : url.pathname.slice(base.length)
		) || '/'
	);
}

/** @param {URL} url */
function get_page_key(url) {
	return (app.hash ? url.hash.replace(/^#/, '') : url.pathname) + url.search;
}

/**
 * @param {{
 *   url: URL;
 *   type: import('@sveltejs/kit').Navigation["type"];
 *   intent?: import('./types.js').NavigationIntent;
 *   delta?: number;
 *   event?: PopStateEvent | MouseEvent;
 *   scroll?: { x: number, y: number };
 *   shallow?: boolean;
 *   target?: { params: Record<string, string> | null; route: { id: string } | null; url: URL };
 * }} opts
 */
function _before_navigate({ url, type, intent, delta, event, scroll, shallow = false, target }) {
	let should_block = false;

	const nav = create_navigation(current, intent, url, type, scroll ?? null, shallow, target);

	if (nav.navigation.type === 'popstate' && delta !== undefined) {
		nav.navigation.delta = delta;
	}

	if (event !== undefined) {
		// @ts-ignore
		nav.navigation.event = event;
	}

	const cancellable = {
		...nav.navigation,
		cancel: () => {
			should_block = true;
			nav.reject(new Error('navigation cancelled'));
		}
	};

	if (!is_navigating) {
		// Don't run the event during redirects
		// TODO this isn't fully right: if you do a goto(...) while another goto(...) is in progress,
		// or you click a link while a navigation is in progress, the beforNavigate calls are not triggered,
		// and maybe they should be?
		before_navigate_callbacks.forEach((fn) => fn(cancellable));
	}

	return should_block ? null : nav;
}

/**
 * @param {{
 *   type: import('@sveltejs/kit').NavigationType;
 *   url: URL;
 *   popped?: {
 *     state: Record<string, any>;
 *     scroll?: { x: number, y: number };
 *     delta: number;
 *     shallow: { params: Record<string, string> | null; route: { id: string } | null; url: URL } | null;
 *   };
 *   reset?: boolean;
 *   replace_state?: boolean;
 *   state?: Record<string, any>;
 *   persist_state?: boolean;
 *   redirect_count?: number;
 *   nav_token?: {};
 *   accept?: () => void;
 *   block?: () => void;
 *   event?: Event;
 *   intent?: NavigationIntent | undefined
 * }} opts
 * @returns {Promise<void>}
 */
async function navigate({
	type,
	url,
	popped,
	reset = true,
	replace_state,
	state = {},
	persist_state = false,
	redirect_count = 0,
	nav_token = {},
	accept = noop,
	block = noop,
	event,
	intent
}) {
	const prev_token = navigation_token;
	const prev_invalidation_token = invalidation_token;
	navigation_token = invalidation_token = nav_token;

	intent ??= await get_navigation_intent(url, false);
	const nav =
		type === 'enter'
			? create_navigation(current, intent, url, type)
			: _before_navigate({
					url,
					type,
					delta: popped?.delta,
					intent,
					scroll: popped?.scroll,
					shallow: !!popped?.shallow,
					target: popped?.shallow ?? undefined,
					// @ts-ignore
					event
				});

	if (!nav) {
		block();
		if (navigation_token === nav_token) navigation_token = prev_token;
		if (invalidation_token === nav_token) invalidation_token = prev_invalidation_token;
		return;
	}

	// store this before calling `accept()`, which may change the index
	const previous_history_index = current_history_index;
	const previous_navigation_index = current_navigation_index;

	accept();

	is_navigating = true;

	if (started && nav.navigation.type !== 'enter') {
		navigating.current = nav.navigation;
	}

	let navigation_result = intent && (await load_route(intent));

	if (!navigation_result) {
		if (is_external_url(url, base, app.hash)) {
			if (DEV && app.hash) {
				// Special case for hash mode during DEV: If someone accidentally forgets to use a hash for the link,
				// they would end up here in an endless loop. Fall back to error page in that case
				navigation_result = await server_fallback(
					url,
					{ id: null },
					await handle_error(
						new SvelteKitError(
							404,
							'Not Found',
							`Not found: ${url.pathname} (did you forget the hash?)`
						),
						{
							url,
							params: {},
							route: { id: null }
						}
					),
					replace_state
				);
			} else {
				return await native_navigation(url, replace_state);
			}
		} else {
			navigation_result = await server_fallback(
				url,
				{ id: null },
				await handle_error(new SvelteKitError(404, 'Not Found', `Not found: ${url.pathname}`), {
					url,
					params: {},
					route: { id: null }
				}),
				replace_state
			);
		}
	}

	// if this is an internal navigation intent, use the normalized
	// URL for the rest of the function
	url = intent?.url || url;

	// abort if user navigated during update
	if (navigation_token !== nav_token) {
		nav.reject(new Error('navigation aborted'));
		return;
	}

	if (!navigation_result) return;

	if (navigation_result.type === 'redirect') {
		// whatwg fetch spec https://fetch.spec.whatwg.org/#http-redirect-fetch says to error after 20 redirects
		if (redirect_count < 20) {
			await navigate({
				type,
				url: new URL(navigation_result.location, url),
				popped,
				reset,
				replace_state,
				state,
				persist_state,
				redirect_count: redirect_count + 1,
				nav_token
			});

			nav.fulfil(undefined);
			return;
		}

		navigation_result = await load_root_error_page({
			error: await handle_error(new Error('Redirect loop'), {
				url,
				params: {},
				route: { id: null }
			}),
			url,
			route: { id: null }
		});

		if (!navigation_result) return;
	} else if (/** @type {number} */ (navigation_result.props.page.status) >= 400) {
		if (await updated.check()) {
			// Before reloading, try to update the service worker if it exists
			await update_service_worker();
			return await native_navigation(url, replace_state);
		}
	}

	// reset invalidation only after a finished navigation. If there are redirects or
	// additional invalidations, they should get the same invalidation treatment
	reset_invalidation();

	updating = true;

	capture_scroll(previous_history_index);
	capture_snapshot(previous_navigation_index);

	// ensure the url pathname matches the page's trailing slash option
	if (navigation_result.props.page.url.pathname !== url.pathname) {
		url.pathname = navigation_result.props.page.url.pathname;
	}

	if (popped) {
		state = popped.state;
	} else {
		// we immediately serialize-then-parse to ensure that the value is
		// serializable, and to prevent the developer from dangerously
		// relying on the identity of the serialized objects
		const serialized_state = stringify(state);
		state = parse(serialized_state);

		// Store the serialized state so the browser history can preserve custom transport values.
		// This is a new navigation, rather than a popstate.
		const change = replace_state ? 0 : 1;
		if (type !== 'enter') {
			if (reset) current_reset_index += 1;
		}

		const entry = {
			[HISTORY_METADATA_KEY]: /** @satisfies {HistoryMetadata} */ ({
				historyIndex: (current_history_index += change),
				navigationIndex: (current_navigation_index += change),
				state: serialized_state,
				persistState: persist_state,
				resetIndex: current_reset_index
			})
		};

		const fn = replace_state ? history.replaceState : history.pushState;
		fn.call(history, entry, '', url);
		set_history_options(current_history_index, entry[HISTORY_METADATA_KEY]);

		if (!replace_state) {
			clear_onward_history(current_history_index, current_navigation_index);
		}
	}

	// also compare ids to avoid using wrong fork (e.g. a new one could've been added while navigating)
	const load_cache_fork = intent && load_cache?.id === intent.id ? load_cache.fork : null;
	// reset preload synchronously after the history state has been set to avoid race conditions
	if (load_cache?.fork && !load_cache_fork) {
		// discard fork of different route
		discard_load_cache();
	} else {
		load_cache = null;
		current_a = { element: undefined, href: undefined };
	}

	navigation_result.props.page.state = state;
	navigation_result.props.page.shallow = popped?.shallow ?? null;

	/**
	 * @type {Promise<void> | undefined}
	 */
	let commit_promise;
	if (started) {
		const after_navigate = (
			await Promise.all(
				// eslint-disable-next-line @typescript-eslint/await-thenable -- we need to await because they can be asynchronous
				Array.from(on_navigate_callbacks, (fn) =>
					fn(/** @type {import('@sveltejs/kit').OnNavigate} */ (nav.navigation))
				)
			)
		).filter(/** @returns {value is () => void} */ (value) => typeof value === 'function');

		if (after_navigate.length > 0) {
			function cleanup() {
				after_navigate.forEach((fn) => {
					after_navigate_callbacks.delete(fn);
				});
			}

			after_navigate.push(cleanup);

			after_navigate.forEach((fn) => {
				after_navigate_callbacks.add(fn);
			});
		}

		// Type-casts are save because we know this resolved a proper SvelteKit route
		const target = popped?.shallow
			? {
					params: navigation_result.state.params,
					route: { id: navigation_result.state.route?.id ?? null },
					url: navigation_result.state.url
				}
			: /** @type {import('@sveltejs/kit').NavigationTarget} */ (nav.navigation.to);
		current = {
			...navigation_result.state,
			nav: {
				params: /** @type {Record<string, any>} */ (target.params),
				route: target.route,
				url: target.url
			}
		};

		// reset url before updating page store
		if (navigation_result.props.page) {
			navigation_result.props.page.url = url;
		}

		// Remove focus before updating the component tree, so that blur/focusout
		// handlers fire while the old component's data is still valid (#14575)
		blur_active_element(reset);

		const fork = load_cache_fork && (await load_cache_fork);

		if (fork) {
			commit_promise = fork.commit();
			// `fork.commit()` applies the preloaded state synchronously before the
			// first `await`, so reset any previously-failed boundaries now so the
			// stale `+error.svelte` is torn down. See sveltejs/kit#15694.
			for (const reset_boundary of resetters) {
				reset_boundary();
			}
			resetters.clear();
		} else {
			apply_navigation_result(navigation_result);

			// Reset any boundaries that failed on a previous navigation now that the
			// new props are applied, otherwise the stale `+error.svelte` stays
			// mounted above the new route's content. See sveltejs/kit#15694.
			for (const reset_boundary of resetters) {
				reset_boundary();
			}
			resetters.clear();

			commit_promise = settled();
		}

		has_navigated = true;
	} else {
		await initialize(navigation_result, target, false);
	}

	const { activeElement } = document;

	await commit_promise;

	if (navigation_token !== nav_token) {
		// a new navigation happened while we were waiting for the DOM to update, so abort
		nav.reject(new Error('navigation aborted'));
		return;
	}

	reset_scroll_and_focus(url, reset ? popped?.scroll : scroll_state(), reset, activeElement);

	is_navigating = false;

	nav.fulfil(undefined);

	// Update to.scroll to the actual scroll position after navigation completed
	if (nav.navigation.to) {
		nav.navigation.to.scroll = scroll_state();
	}

	after_navigate_callbacks.forEach((fn) =>
		fn(/** @type {import('@sveltejs/kit').AfterNavigate} */ (nav.navigation))
	);

	if (type === 'popstate') {
		restore_snapshot(current_navigation_index);
	}

	navigating.current = null;

	updating = false;
}

/**
 * Does a full page reload if it wouldn't result in an endless loop in the SPA case
 * @param {URL} url
 * @param {{ id: string | null }} route
 * @param {App.Error} error
 * @param {boolean} [replace_state]
 * @returns {Promise<import('./types.js').NavigationFinished | undefined>}
 */
async function server_fallback(url, route, error, replace_state) {
	if (url.origin === origin && url.pathname === location.pathname && !hydrated) {
		// We would reload the same page we're currently on, which isn't hydrated,
		// which means no SSR, which means we would end up in an endless loop
		return await load_root_error_page({
			error,
			url,
			route
		});
	}

	if (DEV && error.status !== 404) {
		console.error(
			'An error occurred while loading the page. This will cause a full page reload. (This message will only appear during development.)'
		);

		debugger; // eslint-disable-line
	}

	return await native_navigation(url, replace_state);
}

if (import.meta.hot) {
	import.meta.hot.on('vite:beforeUpdate', () => {
		if (current.error) location.reload();
	});
}

/** @typedef {(typeof PRELOAD_PRIORITIES)['hover'] | (typeof PRELOAD_PRIORITIES)['tap']} PreloadDataPriority */

/**
 * The anchor element whose href is being preloaded. It is reset after navigation
 * or changes when a different anchor element is being preloaded.
 * @type {{ element: Element | SVGAElement | undefined; href: string | SVGAnimatedString | undefined }}
 */
let current_a = { element: undefined, href: undefined };

function setup_preload() {
	/** @type {NodeJS.Timeout} */
	let mousemove_timeout;
	/** @type {HTMLAnchorElement | SVGAElement | undefined} */
	let hovered_a;
	/** @type {PreloadDataPriority} */
	let current_priority;

	function clear_hover_preload() {
		clearTimeout(mousemove_timeout);
		hovered_a?.removeEventListener('mousemove', start_hover_preload);
		hovered_a?.removeEventListener('mouseleave', clear_hover_preload);
		hovered_a = undefined;
	}

	function start_hover_preload() {
		clearTimeout(mousemove_timeout);
		mousemove_timeout = setTimeout(() => {
			if (!hovered_a) return;
			void preload(hovered_a, PRELOAD_PRIORITIES.hover);
		}, 20);
	}

	// Use mouseover initially instead of mousemove to avoid cluttering the event queue
	container.addEventListener('mouseover', (event) => {
		if (!(event.target instanceof Element)) return;

		const a = find_anchor(event.target, container);
		if (!a || a === hovered_a) return;

		clear_hover_preload();
		hovered_a = a;

		const options = get_router_options(a);

		if (
			options.preload_code < PRELOAD_PRIORITIES.hover &&
			options.preload_data < PRELOAD_PRIORITIES.hover
		) {
			// don't add event listeners if no preloading will happen
			return;
		}

		// Instead of just preloading right away, we start a mousemove listener to implement
		// "mouse comes to a rest" behavior. This avoid false positives when you just move
		// your mouse across the screen and happen to pass over a link.
		a.addEventListener('mousemove', start_hover_preload);
		a.addEventListener('mouseleave', clear_hover_preload, { once: true });

		start_hover_preload();
	});

	/** @param {Event} event */
	function tap(event) {
		if (event.defaultPrevented) return;

		const a = find_anchor(/** @type {Element} */ (event.composedPath()[0]), container);
		if (!a) return;

		void preload(a, PRELOAD_PRIORITIES.tap);
	}

	container.addEventListener('mousedown', tap);
	container.addEventListener('touchstart', tap, { passive: true });

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					void _preload_code(new URL(/** @type {HTMLAnchorElement} */ (entry.target).href));
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: 0 }
	);

	/**
	 * @param {HTMLAnchorElement | SVGAElement} a
	 * @param {PreloadDataPriority} priority
	 */
	async function preload(a, priority) {
		// we don't want to preload data again if the user has already hovered/tapped
		const interacted =
			a === current_a.element && a?.href === current_a.href && priority >= current_priority;
		if (!a || interacted) return;

		const { url, external, download } = get_link_info(a, base, app.hash);
		if (external || download) return;

		const options = get_router_options(a);

		// we don't want to preload data for a page we're already on
		const same_url = url && get_page_key(current.url) === get_page_key(url);
		if (options.reload || same_url) return;

		if (priority <= options.preload_data) {
			current_a = { element: a, href: a.href };
			// we don't want to preload data again on tap if we've already preloaded it on hover
			current_priority = PRELOAD_PRIORITIES.tap;

			const intent = await get_navigation_intent(url, false);
			if (!intent) return;

			if (DEV) {
				void _preload_data(intent).catch((error) => {
					console.warn(
						`Preloading data for ${intent.url.pathname} failed with the following error: ${error.message}\n` +
							'If this error is transient, you can ignore it. Otherwise, consider disabling preloading for this route. ' +
							'This route was preloaded due to a data-sveltekit-preload-data attribute. ' +
							'See https://svelte.dev/docs/kit/link-options for more info'
					);
				});
			} else {
				void _preload_data(intent);
			}
		} else if (priority <= options.preload_code) {
			current_a = { element: a, href: a.href };
			current_priority = priority;
			void _preload_code(/** @type {URL} */ (url));
		}
	}

	function after_navigate() {
		observer.disconnect();

		for (const a of container.querySelectorAll('a')) {
			const { url, external, download } = get_link_info(a, base, app.hash);
			if (external || download) continue;

			const options = get_router_options(a);
			if (options.reload) continue;

			if (options.preload_code === PRELOAD_PRIORITIES.viewport) {
				observer.observe(a);
			}

			if (options.preload_code === PRELOAD_PRIORITIES.eager) {
				void _preload_code(/** @type {URL} */ (url));
			}
		}
	}

	after_navigate_callbacks.add(after_navigate);
	after_navigate();
}

/**
 * @param {unknown} error
 * @param {import('@sveltejs/kit').NavigationEvent} event
 * @returns {Promise<App.Error>}
 */
export async function handle_error(error, event) {
	if (error instanceof HttpError) {
		return error.body;
	}

	if (DEV) {
		errored = true;
		console.warn('The next HMR update will cause the page to reload');
	}

	const status = get_status(error);
	const message = get_message(error);
	const app_error = (await app.hooks.handleError({ error, event, status, message })) ?? { message };

	return { ...app_error, status: get_status(app_error, error) };
}

/**
 * @template {Function} T
 * @param {Set<T>} callbacks
 * @param {T} callback
 */
function add_navigation_callback(callbacks, callback) {
	onMount(() => {
		callbacks.add(callback);

		return () => {
			callbacks.delete(callback);
		};
	});
}

/**
 * A lifecycle function that runs the supplied `callback` when the current component mounts, and also whenever we navigate to a URL.
 *
 * `afterNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @param {(navigation: import('@sveltejs/kit').AfterNavigate) => void} callback
 * @returns {void}
 */
export function afterNavigate(callback) {
	add_navigation_callback(after_navigate_callbacks, callback);
}

/**
 * A navigation interceptor that triggers before we navigate to a URL, whether by clicking a link, calling `goto(...)`, or using the browser back/forward controls.
 *
 * Calling `cancel()` will prevent the navigation from completing. If `navigation.type === 'leave'` — meaning the user is navigating away from the app (or closing the tab) — calling `cancel` will trigger the native browser unload confirmation dialog. In this case, the navigation may or may not be cancelled depending on the user's response.
 *
 * When a navigation isn't to a SvelteKit-owned route (and therefore controlled by SvelteKit's client-side router), `navigation.to.route.id` will be `null`.
 *
 * If the navigation will (if not cancelled) cause the document to unload — in other words `'leave'` navigations and `'link'` navigations where `navigation.to.route === null` — `navigation.willUnload` is `true`.
 *
 * `beforeNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @param {(navigation: import('@sveltejs/kit').BeforeNavigate) => void} callback
 * @returns {void}
 */
export function beforeNavigate(callback) {
	add_navigation_callback(before_navigate_callbacks, callback);
}

/**
 * A lifecycle function that runs the supplied `callback` immediately before we navigate to a new URL except during full-page navigations.
 *
 * If you return a `Promise`, SvelteKit will wait for it to resolve before completing the navigation. This allows you to — for example — use `document.startViewTransition`. Avoid promises that are slow to resolve, since navigation will appear stalled to the user.
 *
 * If a function (or a `Promise` that resolves to a function) is returned from the callback, it will be called once the DOM has updated.
 *
 * `onNavigate` must be called during a component initialization. It remains active as long as the component is mounted.
 * @param {(navigation: import('@sveltejs/kit').OnNavigate) => import('types').MaybePromise<(() => void) | void>} callback
 * @returns {void}
 */
export function onNavigate(callback) {
	add_navigation_callback(on_navigate_callbacks, callback);
}

/**
 * If called when the page is being updated following a navigation (in `onMount` or `afterNavigate` or an action, for example), this disables SvelteKit's built-in scroll handling.
 * This is generally discouraged, since it breaks user expectations.
 * @returns {void}
 */
export function disableScrollHandling() {
	if (!BROWSER) {
		throw new Error('Cannot call disableScrollHandling() on the server');
	}

	if (DEV && started && !updating) {
		throw new Error('Can only disable scroll handling during navigation');
	}

	if (updating || !started) {
		autoscroll = false;
	}
}

let warned_on_invalidate_all = false;
let warned_on_replace_state = false;
let warned_on_push_state = false;
let warned_on_replace_state_function = false;

/**
 * @param {string | URL} url
 * @param {'goto' | 'pushState' | 'replaceState'} caller
 */
async function resolve_intent(url, caller) {
	const resolved = new URL(resolve_url(url));

	if (resolved.origin !== origin) {
		throw new Error(
			DEV
				? `Cannot use \`${caller}\` with an external URL. Use \`window.location = "${url}"\` instead`
				: `${caller}: invalid URL`
		);
	}

	const intent = await get_navigation_intent(resolved, false);

	if (!intent) {
		throw new Error(
			DEV
				? `Cannot use \`${caller}\` with a URL that does not resolve to a route within the app. Use \`window.location = "${url}"\` instead`
				: `${caller}: invalid URL`
		);
	}

	return intent;
}

/**
 * Allows you to navigate programmatically to a given route, with control over details such as whether scroll and focus are reset
 * (as they would be with a regular navigation) or preserved.
 *
 * Returns a Promise that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) or the state change has been applied.
 *
 * `goto` is intended for navigations to routes that belong to the app, and will reject if a route cannot be resolved.
 * For external URLs, use `window.location = url` to perform a full-page navigation instead of calling `goto(url)`.
 *
 * @param {string | URL} url Where to navigate to. Note that if you've set [`config.paths.base`](https://svelte.dev/docs/kit/configuration#paths) and the URL is root-relative, you need to prepend the base path if you want to navigate within the app.
 * @param {import('@sveltejs/kit').GotoOptions} [opts] Options related to the navigation
 * @returns {Promise<void>}
 */
export async function goto(url, opts = {}) {
	if (!BROWSER) {
		throw new Error('Cannot call goto(...) on the server');
	}

	if (DEV) {
		if ('replaceState' in opts && !warned_on_replace_state) {
			warned_on_replace_state = true;
			console.warn(
				`The \`goto(..., { replaceState: ${opts.replaceState} })\` option has been deprecated in favour of \`replace\``
			);
		}

		if ('noScroll' in opts || 'keepFocus' in opts) {
			throw new Error(
				`The \`goto(..., { noScroll: true, keepFocus: true })\` options have been replaced by \`reset: false\``
			);
		}
	}

	const replace = opts.replace ?? opts.replaceState ?? false;

	const intent = await resolve_intent(url, 'goto');

	if (opts.shallow) {
		return update_state(
			intent,
			opts.state ?? {},
			{
				replace,
				persist_state: opts.persistState ?? false,
				reset: opts.reset ?? false
			},
			'goto'
		);
	}

	if (DEV && 'invalidateAll' in opts && !warned_on_invalidate_all) {
		warned_on_invalidate_all = true;
		console.warn(
			`The \`goto(..., { invalidateAll: ${opts.invalidateAll} })\` option has been deprecated in favour of \`refreshAll\``
		);
	}

	return _goto(
		intent.url,
		{ ...opts, replace, refreshAll: opts.refreshAll ?? opts.invalidateAll },
		0,
		{},
		intent
	);
}

/**
 * Causes any `load` functions belonging to the currently active page to re-run if they depend on the `url` in question, via `fetch` or `depends`. Returns a `Promise` that resolves when the page is subsequently updated.
 *
 * If the argument is given as a `string` or `URL`, it must resolve to the same URL that was passed to `fetch` or `depends` (including query parameters).
 * To create a custom identifier, use a string beginning with `[a-z]+:` (e.g. `custom:state`) — this is a valid URL.
 *
 * The `function` argument can be used define a custom predicate. It receives the full `URL` and causes `load` to rerun if `true` is returned.
 * This can be useful if you want to invalidate based on a pattern instead of a exact match.
 *
 * ```ts
 * // Example: Match '/path' regardless of the query parameters
 * import { invalidate } from '$app/navigation';
 *
 * invalidate((url) => url.pathname === '/path');
 * ```
 * @param {string | URL | ((url: URL) => boolean)} resource The invalidated URL
 * @param {boolean} [keepState] If `true`, the current `page.state` will be preserved. Otherwise, it will be reset to an empty object. `false` by default.
 * @returns {Promise<void>}
 */
export function invalidate(resource, keepState = false) {
	if (!BROWSER) {
		throw new Error('Cannot call invalidate(...) on the server');
	}

	push_invalidated(resource);

	return _invalidate(!keepState);
}

/**
 * @param {string | URL | ((url: URL) => boolean)} resource The invalidated URL
 */
function push_invalidated(resource) {
	if (typeof resource === 'function') {
		invalidated.push(resource);
	} else {
		const { href } = new URL(resource, location.href);
		invalidated.push((url) => url.href === href);
	}
}

/**
 * Causes all `load` and `query` functions belonging to the currently active page to re-run. Returns a `Promise` that resolves when the page is subsequently updated.
 *
 * Note that this resets `page.state` to an empty object. If you want to preserve `page.state` (for example when using [shallow routing](https://svelte.dev/docs/kit/shallow-routing)), use `refreshAll` instead.
 *
 * @deprecated Use [`refreshAll`](https://svelte.dev/docs/kit/$app-navigation#refreshAll) instead. Unlike `invalidateAll`, `refreshAll` does not reset `page.state`.
 * @returns {Promise<void>}
 */
export function invalidateAll() {
	if (!BROWSER) {
		throw new Error('Cannot call invalidateAll() on the server');
	}

	force_invalidation = true;
	return _invalidate();
}

/**
 * Causes all currently active remote functions to refresh, and all `load` functions belonging to the currently active page to re-run.
 * Returns a `Promise` that resolves when the page is subsequently updated.
 * @returns {Promise<void>}
 */
export function refreshAll() {
	if (!BROWSER) {
		throw new Error('Cannot call refreshAll() on the server');
	}

	force_invalidation = true;
	return _invalidate(false);
}

/**
 * Programmatically preloads the given page, which means
 *  1. ensuring that the code for the page is loaded, and
 *  2. calling the page's load function with the appropriate options.
 *
 * This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with `data-sveltekit-preload-data`.
 * If the next navigation is to `href`, the values returned from load will be used, making navigation instantaneous.
 * Returns a Promise that resolves with the result of running the new route's `load` functions once the preload is complete.
 *
 * @param {string} href Page to preload
 * @returns {Promise<({ type: 'loaded'; data: Record<string, any> } | { type: 'redirect'; location: string } | { type: 'error'; error: App.Error }) & { status: number; }>}
 */
export async function preloadData(href) {
	if (!BROWSER) {
		throw new Error('Cannot call preloadData(...) on the server');
	}

	const url = resolve_url(href);
	const intent = await get_navigation_intent(url, false);

	if (!intent) {
		throw new Error(`Attempted to preload a URL that does not belong to this app: ${url}`);
	}

	/** @type {Awaited<ReturnType<typeof _preload_data>>} */
	let result;

	try {
		result = await _preload_data(intent);
	} catch (error) {
		// `load_route` throws the handled error (an `App.Error` with a `status`)
		// when a preload fails, so surface it in the documented `{ type: 'error' }` shape
		const handled = /** @type {App.Error & { status?: number }} */ (error);
		return {
			type: 'error',
			status: handled?.status ?? 500,
			error: handled
		};
	}

	if (result.type === 'redirect') {
		return {
			type: result.type,
			status: result.status,
			location: result.location
		};
	}

	const { status, data } = result.props.page ?? page;

	return { type: result.type, status, data };
}

/**
 * Programmatically imports the code for routes that haven't yet been fetched.
 * Typically, you might call this to speed up subsequent navigation.
 *
 * Takes a route ID such as `/about` or `/blog/[slug]`. Unlike pathnames, route IDs
 * are never prefixed with the app's [base path](https://svelte.dev/docs/kit/configuration#paths).
 * If you have a pathname rather than a route ID, you can convert it with
 * [`match`](https://svelte.dev/docs/kit/$app-paths#match) from `$app/paths`:
 *
 * ```js
 * import { match } from '$app/paths';
 * import { preloadCode } from '$app/navigation';
 *
 * const matched = await match('/blog/hello-world');
 * if (matched) await preloadCode(matched.id);
 * ```
 *
 * Unlike `preloadData`, this won't call `load` functions.
 * Returns a Promise that resolves when the modules have been imported.
 *
 * @param {RouteId} id
 * @returns {Promise<void>}
 */
export async function preloadCode(id) {
	if (!BROWSER) {
		throw new Error('Cannot call preloadCode(...) on the server');
	}

	if (DEV && id[0] !== '/') {
		throw new Error(
			`argument passed to preloadCode must be a route ID (i.e. "/blog/[slug]" rather than "blog/[slug]")`
		);
	}

	const route = __SVELTEKIT_CLIENT_ROUTING__
		? routes.find((r) => r.id === id)
		: (route_id_cache.get(id) ?? (await load_route_by_id(id)));

	if (route === ENDPOINT_ONLY) {
		if (DEV) {
			console.warn(
				`'${id}' has no \`+page\`, so there is no code to preload. If you meant to warm up an ` +
					`endpoint, request it with \`fetch\` instead.`
			);
		}

		return;
	}

	if (!route) {
		if (DEV) {
			// warn rather than throw, since under client routing an endpoint-only route id is
			// indistinguishable from a typo — the client manifest only contains routes with a `+page`
			let message = `'${id}' did not match any route`;

			if (__SVELTEKIT_CLIENT_ROUTING__) {
				message += ` (note that routes without a \`+page\` have no code to preload)`;

				// the most common migration mistake is passing a pathname, which used to work
				const candidates = [id];
				if (base && id.startsWith(base)) candidates.push(id.slice(base.length) || '/');

				if (candidates.some((path) => routes.some((r) => r.exec(path)))) {
					message += `. It does match as a pathname — use \`match(...)\` from \`$app/paths\` to convert a pathname into a route ID`;
				}
			}

			console.warn(message);
		}

		return;
	}

	await load_route_nodes(route);
}

/**
 * Programmatically create a new history entry with the given `page.state`. Used for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).
 *
 * @deprecated Use `goto(url, { state, shallow: true })` instead.
 * @param {string | URL} url
 * @param {App.PageState} state
 * @returns {Promise<void>}
 */
export async function pushState(url, state) {
	if (!BROWSER) {
		throw new Error('Cannot call pushState(...) on the server');
	}

	if (DEV && !warned_on_push_state) {
		warned_on_push_state = true;
		console.warn(
			'`pushState(...)` is deprecated. Use `goto(url, { state, shallow: true })` instead.'
		);
	}

	const intent = await resolve_intent(url, 'pushState');

	await update_state(
		intent,
		state,
		{ replace: false, persist_state: false, reset: false },
		'pushState'
	);
}

/**
 * Programmatically replace the current history entry with the given `page.state`. Used for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).
 *
 * @deprecated Use `goto(url, { state, shallow: true, replace: true })` instead.
 * @param {string | URL} url
 * @param {App.PageState} state
 * @returns {Promise<void>}
 */
export async function replaceState(url, state) {
	if (!BROWSER) {
		throw new Error('Cannot call replaceState(...) on the server');
	}

	if (DEV && !warned_on_replace_state_function) {
		warned_on_replace_state_function = true;
		console.warn(
			'`replaceState(...)` is deprecated. Use `goto(url, { state, shallow: true, replace: true })` instead.'
		);
	}

	const intent = await resolve_intent(url, 'replaceState');

	await update_state(
		intent,
		state,
		{ replace: true, persist_state: false, reset: false },
		'replaceState'
	);
}

/**
 * @param {NavigationIntent} intent
 * @param {App.PageState} state
 * @param {{ replace: boolean; persist_state: boolean; reset: boolean; }} options
 * @param {'goto' | 'pushState' | 'replaceState'} caller
 */
async function update_state(intent, state, { replace, persist_state, reset }, caller) {
	const url = intent.url;

	if (DEV && !started) {
		throw new Error(`Cannot call ${caller}(...) before router is initialized`);
	}

	const nav =
		// For backwards compatibility we don't trigger navigation hooks etc for push/replaceState
		caller === 'goto' ? _before_navigate({ url, type: 'goto', intent, shallow: true }) : undefined;

	if (!nav && caller === 'goto') return;

	const nav_token = {};

	if (nav) {
		navigation_token = invalidation_token = nav_token;
		is_navigating = true;
		navigating.current = nav.navigation;
		updating = true;
	}

	if (!replace) capture_scroll(current_history_index);
	if (reset) current_reset_index += 1;

	// as above, serialize-then-parse to prevent bugs
	const serialized_state = stringify(state);
	state = parse(serialized_state);

	const entry = {
		[HISTORY_METADATA_KEY]: /** @satisfies {HistoryMetadata} */ ({
			historyIndex: (current_history_index += replace ? 0 : 1),
			navigationIndex: current_navigation_index,
			pageUrl: page.url.href,
			state: serialized_state,
			persistState: persist_state,
			resetIndex: current_reset_index
		})
	};

	const fn = replace ? history.replaceState : history.pushState;
	fn.call(history, entry, '', url);
	set_history_options(current_history_index, entry[HISTORY_METADATA_KEY]);

	if (!replace) {
		has_navigated = true;
		clear_onward_history(current_history_index, current_navigation_index);
	}

	if (nav) {
		const after_navigate = (
			await Promise.all(
				// eslint-disable-next-line @typescript-eslint/await-thenable -- we need to await because they can be asynchronous
				Array.from(on_navigate_callbacks, (fn) =>
					fn(/** @type {import('@sveltejs/kit').OnNavigate} */ (nav.navigation))
				)
			)
		).filter(/** @returns {value is () => void} */ (value) => typeof value === 'function');

		if (after_navigate.length > 0) {
			function cleanup() {
				after_navigate.forEach((fn) => after_navigate_callbacks.delete(fn));
			}

			after_navigate.push(cleanup);
			after_navigate.forEach((fn) => after_navigate_callbacks.add(fn));
		}
	}

	blur_active_element(reset);

	page.state = state;
	page.shallow = {
		params: intent?.params ?? null,
		route: intent ? { id: intent.route.id } : null,
		url
	};

	if (!nav) return;

	const { activeElement } = document;

	await settled();

	if (navigation_token !== nav_token) {
		// a new navigation happened while we were waiting for the DOM to update, so abort
		nav.reject(new Error('navigation aborted'));
		return;
	}

	reset_scroll_and_focus(url, reset ? null : scroll_state(), reset, activeElement);

	is_navigating = false;
	nav.fulfil(undefined);

	if (nav.navigation.to) {
		nav.navigation.to.scroll = scroll_state();
	}

	after_navigate_callbacks.forEach((fn) =>
		fn(/** @type {import('@sveltejs/kit').AfterNavigate} */ (nav.navigation))
	);

	navigating.current = null;
	updating = false;
}

/**
 * This action updates the `form` property of the current page with the given data and updates `page.status`.
 * In case of an error, it redirects to the nearest error page.
 * @template {Record<string, unknown> | undefined} Success
 * @template {Record<string, unknown> | undefined} Failure
 * @param {import('@sveltejs/kit').ActionResult<Success, Failure>} result
 * @returns {Promise<void>}
 */
export async function applyAction(result) {
	if (!BROWSER) {
		throw new Error('Cannot call applyAction(...) on the server');
	}

	if (result.type === 'error') {
		await set_nearest_error_page(result.error);
	} else if (result.type === 'redirect') {
		await _goto(result.location, { refreshAll: true });
	} else {
		page.form = result.data;
		page.status = result.status;

		/** @type {Record<string, any>} */
		// this brings Svelte's view of the world in line with SvelteKit's
		// after use:enhance reset the form....
		props.form = null;

		// ...so that setting the `form` prop takes effect and isn't ignored
		await tick();
		props.form = result.data;

		if (result.type === 'success') {
			reset_focus(/** @type {URL} */ (page.url));
		}
	}
}

/**
 * @param {App.Error} error
 */
export async function set_nearest_error_page(error) {
	const url = new URL(location.href);

	const { branch, route } = current;
	if (!route) return;

	const error_load = await load_nearest_error_page(current.branch.length, branch, route.errors);
	if (error_load) {
		const navigation_result = await get_navigation_result_from_branch({
			url,
			params: current.params,
			branch: branch.slice(0, error_load.idx).concat(error_load.node),
			error,
			// do not set errors, we haven't changed the page so the previous ones are still current
			route
		});

		current = { ...navigation_result.state, nav: current.nav };

		apply_navigation_result(navigation_result);

		void tick().then(() => reset_focus(current.url));
	}
}

function _start_router() {
	history.scrollRestoration = 'manual';

	// Adopted from Nuxt.js
	// Reset scrollRestoration to auto when leaving page, allowing page reload
	// and back-navigation from other pages to use the browser to restore the
	// scrolling position.
	addEventListener('beforeunload', (e) => {
		let should_block = false;

		persist_state();

		if (!is_navigating) {
			const nav = create_navigation(current, undefined, null, 'leave');

			// If we're navigating, beforeNavigate was already called. If we end up in here during navigation,
			// it's due to an external or full-page-reload link, for which we don't want to call the hook again.
			/** @type {import('@sveltejs/kit').BeforeNavigate} */
			const navigation = {
				...nav.navigation,
				cancel: () => {
					should_block = true;
					nav.reject(new Error('navigation cancelled'));
				}
			};

			before_navigate_callbacks.forEach((fn) => fn(navigation));
		}

		if (should_block) {
			e.preventDefault();
			e.returnValue = '';
		} else {
			history.scrollRestoration = 'auto';
		}
	});
	addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			persist_state();
		} else {
			// the tab just became visible — a good time to check for a new deployment
			void updated.check();
		}
	});

	addEventListener('focus', () => {
		void updated.check();
	});

	// @ts-expect-error this isn't supported everywhere yet
	if (!navigator.connection?.saveData) {
		setup_preload();
	}

	/** @param {MouseEvent} event */
	container.addEventListener('click', async (event) => {
		// Adapted from https://github.com/visionmedia/page.js
		// MIT license https://github.com/visionmedia/page.js#license
		if (event.button || event.which !== 1) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (event.defaultPrevented) return;

		const a = find_anchor(/** @type {Element} */ (event.composedPath()[0]), container);
		if (!a) return;

		const { url, external, target, download } = get_link_info(a, base, app.hash);
		if (!url) return;

		// bail out before `beforeNavigate` if link opens in a different tab
		if (target === '_parent' || target === '_top') {
			if (window.parent !== window) return;
		} else if (target && target !== '_self') {
			return;
		}

		const options = get_router_options(a);
		const is_svg_a_element = a instanceof SVGAElement;

		// Ignore URL protocols that differ to the current one and are not http(s) (e.g. `mailto:`, `tel:`, `myapp:`, etc.)
		// This may be wrong when the protocol is x: and the link goes to y:.. which should be treated as an external
		// navigation, but it's not clear how to handle that case and it's not likely to come up in practice.
		// MEMO: Without this condition, firefox will open mailer twice.
		// See:
		// - https://github.com/sveltejs/kit/issues/4045
		// - https://github.com/sveltejs/kit/issues/5725
		// - https://github.com/sveltejs/kit/issues/6496
		if (
			!is_svg_a_element &&
			url.protocol !== location.protocol &&
			!(url.protocol === 'https:' || url.protocol === 'http:')
		)
			return;

		if (download) return;

		const [nonhash, hash] = (app.hash ? url.hash.replace(/^#/, '') : url.href).split('#');
		const same_pathname = nonhash === strip_hash(location);

		// Ignore the following but fire beforeNavigate
		if (external || (options.reload && (!same_pathname || !hash))) {
			if (_before_navigate({ url, type: 'link', event })) {
				// set `navigating` to `true` to prevent `beforeNavigate` callbacks
				// being called when the page unloads
				is_navigating = true;
			} else {
				event.preventDefault();
			}

			return;
		}

		// Check if new url only differs by hash and use the browser default behavior in that case
		// This will ensure the `hashchange` event is fired
		// Removing the hash does a full page navigation in the browser, so make sure a hash is present
		if (hash !== undefined && same_pathname) {
			// If we are trying to navigate to the same hash, we should only
			// attempt to scroll to that element and avoid any history changes.
			// Otherwise, this can cause Firefox to incorrectly assign a null
			// history state value without any signal that we can detect.
			const [, current_hash] = current.url.href.split('#');
			if (current_hash === hash) {
				event.preventDefault();

				// We're already on /# and click on a link that goes to /#, or we're on
				// /#top and click on a link that goes to /#top. In those cases just go to
				// the top of the page, and avoid a history change.
				if (hash === '' || (hash === 'top' && a.ownerDocument.getElementById('top') === null)) {
					scrollTo({ top: 0 });
				} else {
					const element = a.ownerDocument.getElementById(decodeURIComponent(hash));
					if (element) {
						element.scrollIntoView();
						element.focus();
					}
				}

				return;
			}
			// set this flag to distinguish between navigations triggered by
			// clicking a hash link and those triggered by popstate. We gotta retrieve
			// history metadata here because the hashchange event will occur after history.state was updated
			hash_navigating = {
				.../** @type {HistoryMetadata} */ (get_history_metadata()),
				resetIndex: current_reset_index + (options.reset ? 1 : 0)
			};

			capture_scroll(current_history_index);

			update_url(url);

			if (!options.replace_state) return;

			// hashchange event shouldn't occur if the router is replacing state.
			hash_navigating = null;
		}

		event.preventDefault();

		// allow the browser to repaint before navigating —
		// this prevents INP scores being penalised
		await new Promise((fulfil) => {
			requestAnimationFrame(() => {
				setTimeout(fulfil, 0);
			});

			setTimeout(fulfil, 100); // fallback for edge case where rAF doesn't fire because e.g. tab was backgrounded
		});

		const changed = url.href !== location.href;

		await _goto(url, {
			type: 'link',
			reset: options.reset,
			replace: options.replace_state ?? !changed,
			refreshAll: !changed,
			event
		});
	});

	container.addEventListener('submit', (event) => {
		if (event.defaultPrevented) return;

		const form = /** @type {HTMLFormElement} */ (
			HTMLFormElement.prototype.cloneNode.call(event.target)
		);

		const submitter = /** @type {HTMLButtonElement | HTMLInputElement | null} */ (event.submitter);

		const target = submitter?.formTarget || form.target;

		if (target === '_blank') return;

		const method = submitter?.formMethod || form.method;

		if (method !== 'get') return;

		// It is impossible to use form actions with hash router, so we just ignore handling them here
		const url = new URL(
			(submitter?.hasAttribute('formaction') && submitter?.formAction) || form.action
		);

		if (is_external_url(url, base, false)) return;

		const event_form = /** @type {HTMLFormElement} */ (event.target);

		const options = get_router_options(event_form);
		if (options.reload) return;

		event.preventDefault();
		event.stopPropagation();

		const data = new FormData(event_form, submitter);

		// @ts-expect-error `URLSearchParams(fd)` is kosher, but typescript doesn't know that
		url.search = new URLSearchParams(data).toString();

		void navigate({
			type: 'form',
			url,
			reset: options.reset,
			replace_state: options.replace_state ?? url.href === location.href,
			event
		});
	});

	addEventListener('popstate', async (event) => {
		if (resetting_focus) return;

		const history_metadata = get_history_metadata(event.state);

		if (history_metadata?.historyIndex) {
			const history_index = history_metadata.historyIndex;
			const source_info = history_info[current_history_index];
			navigation_token = invalidation_token = {};

			// if a popstate-driven navigation is cancelled, we need to counteract it
			// with history.go, which means we end up back here, hence this check
			if (history_index === current_history_index) return;

			const delta = history_index - current_history_index;
			const reset_index = history_metadata.resetIndex;
			const reset = reset_index !== (source_info?.resetIndex ?? current_reset_index);
			const scroll = history_info[history_index]?.scroll;
			const state = parse(history_metadata.state);
			const url = new URL(history_metadata.pageUrl ?? location.href);
			const navigation_index = history_metadata.navigationIndex;
			const is_hash_change =
				current.url && (location.href + current.url.href).includes('#') // check if even has a hash
					? strip_hash(location) === strip_hash(current.url)
					: false;
			const shallow =
				navigation_index === current_navigation_index &&
				((has_navigated &&
					(history_metadata.pageUrl === undefined || history_metadata.pageUrl === location.href)) ||
					is_hash_change);
			const shallow_url = history_metadata.pageUrl ? new URL(location.href) : null;
			const shallow_intent = shallow_url
				? await get_navigation_intent(shallow_url, false)
				: undefined;
			const shallow_target = shallow_url
				? {
						params: shallow_intent?.params ?? null,
						route: shallow_intent ? { id: shallow_intent.route.id } : null,
						url: shallow_url
					}
				: null;

			if (shallow) {
				// We don't need to navigate, we just need to update scroll and/or state.
				// This happens with hash links and `pushState`/`replaceState`. The
				// exception is if we haven't navigated yet, since we could have
				// got here after a modal navigation then a reload

				blur_active_element(reset);

				if (state !== page.state) {
					page.state = state;
				}

				page.shallow = shallow_target;

				update_url(url);

				capture_scroll(current_history_index);
				current_history_index = history_index;
				current_reset_index = reset_index;
				if (reset && scroll) scrollTo(scroll.x, scroll.y);
				return;
			}

			await navigate({
				type: 'popstate',
				url,
				reset,
				popped: {
					state,
					scroll,
					delta,
					shallow: shallow_target
				},
				accept: () => {
					current_history_index = history_index;
					current_navigation_index = navigation_index;
					current_reset_index = reset_index;
				},
				block: () => {
					history.go(-delta);
				},
				nav_token: navigation_token,
				event
			});
		} else {
			// since popstate event is also emitted when an anchor referencing the same
			// document is clicked, we have to check that the router isn't already handling
			// the navigation. otherwise we would be updating the page store twice.
			if (!hash_navigating) {
				const url = new URL(location.href);
				update_url(url);

				// if the user edits the hash via the browser URL bar, trigger a full-page
				// reload to align with pathname router behavior
				if (app.hash) {
					location.reload();
				}
			}
		}
	});

	addEventListener('hashchange', () => {
		// if the hashchange happened as a result of clicking on a link,
		// we need to update history, otherwise we have to leave it alone
		if (hash_navigating) {
			const history_metadata = hash_navigating;
			hash_navigating = null;
			current_reset_index = history_metadata.resetIndex;
			history.replaceState(
				{
					...history.state,
					[HISTORY_METADATA_KEY]: {
						...history_metadata,
						historyIndex: ++current_history_index,
						navigationIndex: current_navigation_index
					}
				},
				'',
				location.href
			);
			set_history_options(current_history_index, history_metadata);
		}
	});

	// fix link[rel=icon], because browsers will occasionally try to load relative
	// URLs after a pushState/replaceState, resulting in a 404 — see
	// https://github.com/sveltejs/kit/issues/3748#issuecomment-1125980897
	for (const link of document.querySelectorAll('link')) {
		if (ICON_REL_ATTRIBUTES.has(link.rel)) {
			link.href = link.href; // eslint-disable-line
		}
	}

	addEventListener('pageshow', (event) => {
		// If the user navigates to another site and then uses the back button and
		// bfcache hits, we need to set navigating to null, the site doesn't know
		// the navigation away from it was successful.
		// Info about bfcache here: https://web.dev/bfcache
		if (event.persisted) {
			navigating.current = null;
		}
	});

	/**
	 * @param {URL} url
	 */
	function update_url(url) {
		current.url = page.url = url;
	}
}

/**
 * @param {HTMLElement} target
 * @param {import('./types.js').HydrateOptions} opts
 * @returns {Promise<void>}
 */
async function _hydrate(
	target,
	{ status, error, node_ids, params, route, server_route, data: server_data_nodes, form }
) {
	hydrated = true;

	const url = new URL(location.href);

	/** @type {import('types').CSRRoute | undefined} */
	let parsed_route;

	if (__SVELTEKIT_CLIENT_ROUTING__) {
		if (!__SVELTEKIT_EMBEDDED__) {
			// See https://github.com/sveltejs/kit/pull/4935#issuecomment-1328093358 for one motivation
			// of determining the params on the client side.
			({ params = {}, route = { id: null } } = (await get_navigation_intent(url, false)) || {});
		}

		parsed_route = routes.find(({ id }) => id === route.id);
	} else {
		// undefined in case of 404
		if (server_route) {
			parsed_route = route = parse_and_cache_server_route(server_route);
		} else {
			route = { id: null };
			params = {};
		}
	}

	/** @type {import('./types.js').NavigationFinished | undefined} */
	let result;
	let should_hydrate = true;

	try {
		const branch_promises = node_ids.map(async (n, i) => {
			const server_data_node = server_data_nodes[i];
			// Type isn't completely accurate, we still need to deserialize uses
			if (server_data_node?.uses) {
				server_data_node.uses = deserialize_uses(server_data_node.uses);
			}

			return load_node({
				loader: app.nodes[n],
				url,
				params,
				route,
				parent: async () => {
					const data = {};
					for (let j = 0; j < i; j += 1) {
						Object.assign(data, (await branch_promises[j]).data);
					}
					return data;
				},
				server_data_node: create_data_node(server_data_node)
			});
		});

		/** @type {Array<import('./types.js').BranchNode | undefined>} */
		const branch = await Promise.all(branch_promises);

		// server-side will have compacted the branch, reinstate empty slots
		// so that error boundaries can be lined up correctly
		if (parsed_route) {
			const layouts = parsed_route.layouts;
			for (let i = 0; i < layouts.length; i++) {
				if (!layouts[i]) {
					branch.splice(i, 0, undefined);
				}
			}
		}

		result = await get_navigation_result_from_branch({
			url,
			params,
			branch,
			status,
			error,
			errors: parsed_route?.errors, // TODO load earlier?
			form,
			route: parsed_route ?? null
		});
	} catch (error) {
		if (error instanceof Redirect) {
			// this is a real edge case — `load` would need to return
			// a redirect but only in the browser
			return await native_navigation(new URL(error.location, location.href));
		}

		const handled_error = await handle_error(error, { url, params, route });

		result = await load_root_error_page({
			error: handled_error,
			url,
			route
		});

		target.textContent = '';
		should_hydrate = false;
	}

	// Exit early when we encounter a redirect while loading the root error page.
	// In this case, `initialize` will be called later on
	if (!result) return;

	if (result.props.page) {
		const history_metadata = get_history_metadata();
		result.props.page.state = history_metadata?.persistState ? parse(history_metadata.state) : {};
	}

	await initialize(result, target, should_hydrate);
}

/**
 * @param {URL} url
 * @param {boolean[]} invalid
 * @returns {Promise<import('types').ServerNodesResponse | import('types').ServerRedirectNode>}
 */
async function load_data(url, invalid) {
	const data_url = new URL(url);
	data_url.pathname = add_data_suffix(url.pathname);
	if (url.pathname.endsWith('/')) {
		data_url.searchParams.append(TRAILING_SLASH_PARAM, '1');
	}
	if (DEV && url.searchParams.has(INVALIDATED_PARAM)) {
		throw new Error(`Cannot used reserved query parameter "${INVALIDATED_PARAM}"`);
	}
	data_url.searchParams.append(INVALIDATED_PARAM, invalid.map((i) => (i ? '1' : '0')).join(''));

	// use window.fetch directly to allow using a 3rd party-patched fetch implementation
	const fetcher = DEV ? dev_fetch : window.fetch;
	const res = await fetcher(data_url.href, {});

	// detect new deployments from the response header
	notify_version(res.headers.get('x-sveltekit-version'));

	if (!res.ok) {
		// turn it into a HttpError to not call handleError on the client again (was already handled on the server)
		// if `__data.json` doesn't exist or the server has an internal error,
		// avoid parsing the HTML error page as a JSON
		/** @type {App.Error} */
		let error = { status: res.status, message: 'Internal Error' };

		if (res.headers.get('content-type')?.includes('application/json')) {
			error = { status: res.status, ...(await res.json()) };
		} else if (res.status === 404) {
			error.message = 'Not Found';
		}

		throw new HttpError(error);
	}

	return new Promise((resolve, reject) => {
		process_stream(resolve, res).catch(reject);
	});

	// TODO edge case handling necessary? stream() read fails?
}

/**
 * @param {(value: ServerNodesResponse | ServerRedirectNode) => void} resolve
 * @param {Response} res
 * @returns {Promise<void>}
 */
async function process_stream(resolve, res) {
	const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();

	/**
	 * Map of deferred promises that will be resolved by a subsequent chunk of data
	 * @type {Map<string, import('types').Deferred>}
	 */
	const deferreds = new Map();

	/**
	 * @param {any} data
	 */
	function deserialize(data) {
		return devalue.unflatten(data, {
			...app.decoders,
			Promise: (id) => {
				return new Promise((fulfil, reject) => {
					deferreds.set(id, { fulfil, reject });
				});
			}
		});
	}

	for await (const node of read_ndjson(reader)) {
		if (node.type === 'redirect') {
			return resolve(node);
		}

		if (node.type === 'data') {
			// This is the first (and possibly only, if no pending promises) chunk
			node.nodes?.forEach((/** @type {any} */ node) => {
				if (node?.type === 'data') {
					node.uses = deserialize_uses(node.uses);
					node.data = deserialize(node.data);
				}
			});

			resolve(node);
		} else if (node.type === 'chunk') {
			// This is a subsequent chunk containing deferred data
			const { id, data, error } = node;
			const deferred = /** @type {import('types').Deferred} */ (deferreds.get(id));
			deferreds.delete(id);

			if (error) {
				deferred.reject(deserialize(error));
			} else {
				deferred.fulfil(deserialize(data));
			}
		}
	}
}

/**
 * @param {any} uses
 * @return {import('types').Uses}
 */
function deserialize_uses(uses) {
	return {
		dependencies: new Set(uses?.dependencies ?? []),
		params: new Set(uses?.params ?? []),
		parent: !!uses?.parent,
		route: !!uses?.route,
		url: !!uses?.url,
		search_params: new Set(uses?.search_params ?? [])
	};
}

/**
 * This flag is used to avoid client-side navigation when we're only using
 * `location.replace()` to set focus.
 */
let resetting_focus = false;

/**
 * @param {URL} url
 * @param {boolean} [scroll]
 */
function reset_focus(url, scroll = true) {
	const autofocus = document.querySelector('[autofocus]');
	if (autofocus) {
		// @ts-ignore
		autofocus.focus();
	} else {
		// Reset page selection and focus

		// Mimic the browsers' behaviour and set the sequential focus navigation
		// starting point to the fragment identifier.
		const element = get_hash_element(url);
		if (element) {
			const { x, y } = scroll_state();

			// `element.focus()` doesn't work on Safari and Firefox Ubuntu so we need
			// to use this hack with `location.replace()` instead.
			setTimeout(() => {
				const history_state = history.state;

				resetting_focus = true;
				location.replace(new URL(`#${element.id}`, location.href));

				// Firefox has a bug that sets the history state to `null` so we need to
				// restore it after. See https://bugzilla.mozilla.org/show_bug.cgi?id=1199924
				// This is also needed to restore the original hash if we're using hash routing
				history.replaceState(history_state, '', url);

				// If scroll management has already happened earlier, we need to restore
				// the scroll position after setting the sequential focus navigation starting point
				if (scroll) scrollTo(x, y);
				resetting_focus = false;
			});
		} else {
			// If the ID doesn't exist, we try to mimic browsers' behaviour as closely
			// as possible by targeting the first scrollable region. Unfortunately, it's
			// not a perfect match — e.g. shift-tabbing won't immediately cycle up from
			// the end of the page on Chromium
			// See https://html.spec.whatwg.org/multipage/interaction.html#get-the-focusable-area
			const root = document.body;
			const tabindex = root.getAttribute('tabindex');

			root.tabIndex = -1;
			root.focus({ preventScroll: true, focusVisible: false });

			// restore `tabindex` as to prevent `root` from stealing input from elements
			if (tabindex !== null) {
				root.setAttribute('tabindex', tabindex);
			} else {
				root.removeAttribute('tabindex');
			}
		}

		// capture current selection, so we can compare the state after
		// snapshot restoration and afterNavigate callbacks have run
		const selection = getSelection();

		if (selection && selection.type !== 'None') {
			/** @type {Range[]} */
			const ranges = [];

			for (let i = 0; i < selection.rangeCount; i += 1) {
				ranges.push(selection.getRangeAt(i));
			}

			setTimeout(() => {
				if (selection.rangeCount !== ranges.length) return;

				for (let i = 0; i < selection.rangeCount; i += 1) {
					const a = ranges[i];
					const b = selection.getRangeAt(i);

					// we need to do a deep comparison rather than just `a !== b` because
					// Safari behaves differently to other browsers
					if (
						a.commonAncestorContainer !== b.commonAncestorContainer ||
						a.startContainer !== b.startContainer ||
						a.endContainer !== b.endContainer ||
						a.startOffset !== b.startOffset ||
						a.endOffset !== b.endOffset
					) {
						return;
					}
				}

				// if the selection hasn't changed (as a result of an element being (auto)focused,
				// or a programmatic selection, we reset everything as part of the navigation)
				// fixes https://github.com/sveltejs/kit/issues/8439
				selection.removeAllRanges();
			});
		}
	}
}

/**
 * @template {import('@sveltejs/kit').NavigationType} T
 * @param {import('./types.js').NavigationState} current
 * @param {import('./types.js').NavigationIntent | undefined} intent
 * @param {URL | null} url
 * @param {T} type
 * @param {{ x: number, y: number } | null} [target_scroll] The scroll position for the target (for popstate navigations)
 * @param {boolean} [shallow]
 * @param {{ params: Record<string, string> | null; route: { id: string } | null; url: URL }} [target]
 */
function create_navigation(
	current,
	intent,
	url,
	type,
	target_scroll = null,
	shallow = false,
	target
) {
	/** @type {(value: any) => void} */
	let fulfil;

	/** @type {(error: any) => void} */
	let reject;

	const complete = new Promise((f, r) => {
		fulfil = f;
		reject = r;
	});

	// Handle any errors off-chain so that it doesn't show up as an unhandled rejection
	complete.catch(noop);

	/** @type {(import('@sveltejs/kit').Navigation | import('@sveltejs/kit').AfterNavigate) & { type: T }} */
	const navigation = /** @type {any} */ ({
		from: {
			params: current.params,
			route: { id: current.route?.id ?? null },
			url: current.url,
			scroll: scroll_state()
		},
		to: url && {
			params: target ? target.params : (intent?.params ?? null),
			route: { id: target ? (target.route?.id ?? null) : (intent?.route?.id ?? null) },
			url: target?.url ?? url,
			scroll: target_scroll
		},
		willUnload: !shallow && !intent,
		type,
		shallow,
		complete
	});

	return {
		navigation,
		// @ts-expect-error
		fulfil,
		// @ts-expect-error
		reject
	};
}

/**
 * @param {URL} url
 * @returns {URL}
 */
function decode_hash(url) {
	const new_url = new URL(url);
	// Safari, for some reason, does change # to %23, when entered through the address bar
	new_url.hash = decodeURIComponent(url.hash);
	return new_url;
}

/**
 * @param {URL} url
 * @returns {string}
 */
function get_id(url) {
	let id;

	if (app.hash) {
		const [, , second] = url.hash.split('#', 3);
		id = second ?? '';
	} else {
		id = url.hash.slice(1);
	}

	return decodeURIComponent(id);
}

/**
 * @param {URL} url
 * @returns {Element | null}
 */
function get_hash_element(url) {
	const id = get_id(url);
	return id ? document.getElementById(id) : null;
}

if (DEV) {
	// Nasty hack to silence harmless warnings the user can do nothing about
	const console_warn = console.warn;
	console.warn = function warn(...args) {
		if (
			args.length === 1 &&
			/<(Layout|Page|Error)(_[\w$]+)?> was created (with unknown|without expected) prop '(data|form)'/.test(
				args[0]
			)
		) {
			return;
		}
		console_warn(...args);
	};

	if (import.meta.hot) {
		import.meta.hot.on('vite:beforeUpdate', () => {
			if (errored) {
				location.reload();
			}
		});
	}
}

/**
 * @param {NavigationFinished} result
 */
function apply_navigation_result(result) {
	Object.assign(page, result.props.page);

	props.tree.data = result.props.tree.data;
	props.tree.child = result.props.tree.child;

	if ('form' in result.props) {
		props.form = result.props.form;
	}

	if ('error' in result.props) {
		props.error = result.props.error;
	}
}
