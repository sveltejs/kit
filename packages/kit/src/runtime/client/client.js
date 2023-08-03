import { DEV } from 'esm-env';
import { onMount, tick } from 'svelte';
import {
	add_data_suffix,
	decode_params,
	decode_pathname,
	make_trackable,
	normalize_path
} from '../../utils/url.js';
import {
	initial_fetch,
	lock_fetch,
	native_fetch,
	subsequent_fetch,
	unlock_fetch
} from './fetcher.js';
import { parse } from './parse.js';
import * as storage from './session-storage.js';
import {
	find_anchor,
	get_base_uri,
	get_link_info,
	get_router_options,
	is_external_url,
	scroll_state
} from './utils.js';

import { base } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { compact } from '../../utils/array.js';
import { validate_page_exports } from '../../utils/exports.js';
import { unwrap_promises } from '../../utils/promises.js';
import { HttpError, Redirect } from '../control.js';
import { INVALIDATED_PARAM, validate_depends } from '../shared.js';
import { INDEX_KEY, PRELOAD_PRIORITIES, SCROLL_KEY, SNAPSHOT_KEY } from './constants.js';
import { stores } from './singletons.js';

let errored = false;

// We track the scroll position associated with each history entry in sessionStorage,
// rather than on history.state itself, because when navigation is driven by
// popstate it's too late to update the scroll position associated with the
// state we're navigating from

/** @typedef {{ x: number, y: number }} ScrollPosition */
/** @type {Record<number, ScrollPosition>} */
const scroll_positions = storage.get(SCROLL_KEY) ?? {};

/** @type {Record<string, any[]>} */
const snapshots = storage.get(SNAPSHOT_KEY) ?? {};

/** @param {number} index */
function update_scroll_positions(index) {
	scroll_positions[index] = scroll_state();
}

/**
 * @param {import('./types').SvelteKitApp} app
 * @param {HTMLElement} target
 * @returns {import('./types').Client}
 */
export function create_client(app, target) {
	const routes = parse(app);

	const default_layout_loader = app.nodes[0];
	const default_error_loader = app.nodes[1];

	// we import the root layout/error nodes eagerly, so that
	// connectivity errors after initialisation don't nuke the app
	default_layout_loader();
	default_error_loader();

	const container = __SVELTEKIT_EMBEDDED__ ? target : document.documentElement;
	/** @type {Array<((url: URL) => boolean)>} */
	const invalidated = [];

	/**
	 * An array of the `+layout.svelte` and `+page.svelte` component instances
	 * that currently live on the page — used for capturing and restoring snapshots.
	 * It's updated/manipulated through `bind:this` in `Root.svelte`.
	 * @type {import('svelte').SvelteComponent[]}
	 */
	const components = [];

	/** @type {{id: string, promise: Promise<import('./types').NavigationResult>} | null} */
	let load_cache = null;

	const callbacks = {
		/** @type {Array<(navigation: import('@sveltejs/kit').BeforeNavigate) => void>} */
		before_navigate: [],

		/** @type {Array<(navigation: import('@sveltejs/kit').AfterNavigate) => void>} */
		after_navigate: []
	};

	/** @type {import('./types').NavigationState} */
	let current = {
		branch: [],
		error: null,
		// @ts-ignore - we need the initial value to be null
		url: null
	};

	/** this being true means we SSR'd */
	let hydrated = false;
	let started = false;
	let autoscroll = true;
	let updating = false;
	let navigating = false;
	let hash_navigating = false;

	let force_invalidation = false;

	/** @type {import('svelte').SvelteComponent} */
	let root;

	// keeping track of the history index in order to prevent popstate navigation events if needed
	let current_history_index = history.state?.[INDEX_KEY];

	if (!current_history_index) {
		// we use Date.now() as an offset so that cross-document navigations
		// within the app don't result in data loss
		current_history_index = Date.now();

		// create initial history entry, so we can return here
		history.replaceState(
			{ ...history.state, [INDEX_KEY]: current_history_index },
			'',
			location.href
		);
	}

	// if we reload the page, or Cmd-Shift-T back to it,
	// recover scroll position
	const scroll = scroll_positions[current_history_index];
	if (scroll) {
		history.scrollRestoration = 'manual';
		scrollTo(scroll.x, scroll.y);
	}

	/** @type {import('@sveltejs/kit').Page} */
	let page;

	/** @type {{}} */
	let token;

	/** @type {Promise<void> | null} */
	let pending_invalidate;

	async function invalidate() {
		// Accept all invalidations as they come, don't swallow any while another invalidation
		// is running because subsequent invalidations may make earlier ones outdated,
		// but batch multiple synchronous invalidations.
		pending_invalidate = pending_invalidate || Promise.resolve();
		await pending_invalidate;
		if (!pending_invalidate) return;
		pending_invalidate = null;

		const url = new URL(location.href);
		const intent = get_navigation_intent(url, true);
		// Clear preload, it might be affected by the invalidation.
		// Also solves an edge case where a preload is triggered, the navigation for it
		// was then triggered and is still running while the invalidation kicks in,
		// at which point the invalidation should take over and "win".
		load_cache = null;

		const nav_token = (token = {});
		const navigation_result = intent && (await load_route(intent));
		if (nav_token !== token) return;

		if (navigation_result) {
			if (navigation_result.type === 'redirect') {
				return goto(new URL(navigation_result.location, url).href, {}, [url.pathname], nav_token);
			} else {
				if (navigation_result.props.page !== undefined) {
					page = navigation_result.props.page;
				}
				root.$set(navigation_result.props);
			}
		}
	}

	/** @param {number} index */
	function capture_snapshot(index) {
		if (components.some((c) => c?.snapshot)) {
			snapshots[index] = components.map((c) => c?.snapshot?.capture());
		}
	}

	/** @param {number} index */
	function restore_snapshot(index) {
		snapshots[index]?.forEach((value, i) => {
			components[i]?.snapshot?.restore(value);
		});
	}

	function persist_state() {
		update_scroll_positions(current_history_index);
		storage.set(SCROLL_KEY, scroll_positions);

		capture_snapshot(current_history_index);
		storage.set(SNAPSHOT_KEY, snapshots);
	}

	/**
	 * @param {string | URL} url
	 * @param {{ noScroll?: boolean; replaceState?: boolean; keepFocus?: boolean; state?: any; invalidateAll?: boolean }} opts
	 * @param {string[]} redirect_chain
	 * @param {{}} [nav_token]
	 */
	async function goto(
		url,
		{
			noScroll = false,
			replaceState = false,
			keepFocus = false,
			state = {},
			invalidateAll = false
		},
		redirect_chain,
		nav_token
	) {
		if (typeof url === 'string') {
			url = new URL(url, get_base_uri(document));
		}

		return navigate({
			url,
			scroll: noScroll ? scroll_state() : null,
			keepfocus: keepFocus,
			redirect_chain,
			details: {
				state,
				replaceState
			},
			nav_token,
			accepted: () => {
				if (invalidateAll) {
					force_invalidation = true;
				}
			},
			blocked: () => {},
			type: 'goto'
		});
	}

	/** @param {import('./types').NavigationIntent} intent */
	async function preload_data(intent) {
		load_cache = {
			id: intent.id,
			promise: load_route(intent).then((result) => {
				if (result.type === 'loaded' && result.state.error) {
					// Don't cache errors, because they might be transient
					load_cache = null;
				}
				return result;
			})
		};

		return load_cache.promise;
	}

	/** @param {...string} pathnames */
	async function preload_code(...pathnames) {
		const matching = routes.filter((route) => pathnames.some((pathname) => route.exec(pathname)));

		const promises = matching.map((r) => {
			return Promise.all([...r.layouts, r.leaf].map((load) => load?.[1]()));
		});

		await Promise.all(promises);
	}

	/** @param {import('./types').NavigationFinished} result */
	function initialize(result) {
		if (DEV && result.state.error && document.querySelector('vite-error-overlay')) return;

		current = result.state;

		const style = document.querySelector('style[data-sveltekit]');
		if (style) style.remove();

		page = /** @type {import('@sveltejs/kit').Page} */ (result.props.page);

		root = new app.root({
			target,
			props: { ...result.props, stores, components },
			hydrate: true
		});

		restore_snapshot(current_history_index);

		/** @type {import('@sveltejs/kit').AfterNavigate} */
		const navigation = {
			from: null,
			to: {
				params: current.params,
				route: { id: current.route?.id ?? null },
				url: new URL(location.href)
			},
			willUnload: false,
			type: 'enter'
		};
		callbacks.after_navigate.forEach((fn) => fn(navigation));

		started = true;
	}

	/**
	 *
	 * @param {{
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   branch: Array<import('./types').BranchNode | undefined>;
	 *   status: number;
	 *   error: App.Error | null;
	 *   route: import('types').CSRRoute | null;
	 *   form?: Record<string, any> | null;
	 * }} opts
	 */
	async function get_navigation_result_from_branch({
		url,
		params,
		branch,
		status,
		error,
		route,
		form
	}) {
		/** @type {import('types').TrailingSlash} */
		let slash = 'never';
		for (const node of branch) {
			if (node?.slash !== undefined) slash = node.slash;
		}
		url.pathname = normalize_path(url.pathname, slash);
		// eslint-disable-next-line
		url.search = url.search; // turn `/?` into `/`

		/** @type {import('./types').NavigationFinished} */
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
				// @ts-ignore Somehow it's getting SvelteComponent and SvelteComponentDev mixed up
				constructors: compact(branch).map((branch_node) => branch_node.node.component)
			}
		};

		if (form !== undefined) {
			result.props.form = form;
		}

		let data = {};
		let data_changed = !page;

		let p = 0;

		for (let i = 0; i < Math.max(branch.length, current.branch.length); i += 1) {
			const node = branch[i];
			const prev = current.branch[i];

			if (node?.data !== prev?.data) data_changed = true;
			if (!node) continue;

			data = { ...data, ...node.data };

			// Only set props if the node actually updated. This prevents needless rerenders.
			if (data_changed) {
				result.props[`data_${p}`] = data;
			}

			p += 1;
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
				status,
				url: new URL(url),
				form: form ?? null,
				// The whole page store is updated, but this way the object reference stays the same
				data: data_changed ? data : page.data
			};
		}

		return result;
	}

	/**
	 * Call the load function of the given node, if it exists.
	 * If `server_data` is passed, this is treated as the initial run and the page endpoint is not requested.
	 *
	 * @param {{
	 *   loader: import('types').CSRPageNodeLoader;
	 * 	 parent: () => Promise<Record<string, any>>;
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   route: { id: string | null };
	 * 	 server_data_node: import('./types').DataNode | null;
	 * }} options
	 * @returns {Promise<import('./types').BranchNode>}
	 */
	async function load_node({ loader, parent, url, params, route, server_data_node }) {
		/** @type {Record<string, any> | null} */
		let data = null;

		/** @type {import('types').Uses} */
		const uses = {
			dependencies: new Set(),
			params: new Set(),
			parent: false,
			route: false,
			url: false
		};

		const node = await loader();

		if (DEV) {
			validate_page_exports(node.universal);
		}

		if (node.universal?.load) {
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
				route: {
					get id() {
						uses.route = true;
						return route.id;
					}
				},
				params: new Proxy(params, {
					get: (target, key) => {
						uses.params.add(/** @type {string} */ (key));
						return target[/** @type {string} */ (key)];
					}
				}),
				data: server_data_node?.data ?? null,
				url: make_trackable(url, () => {
					uses.url = true;
				}),
				async fetch(resource, init) {
					/** @type {URL | string} */
					let requested;

					if (resource instanceof Request) {
						requested = resource.url;

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
							headers: resource.headers,
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
					} else {
						requested = resource;
					}

					// we must fixup relative urls so they are resolved from the target page
					const resolved = new URL(requested, url);
					depends(resolved.href);

					// match ssr serialized data url, which is important to find cached responses
					if (resolved.origin === url.origin) {
						requested = resolved.href.slice(url.origin.length);
					}

					// prerendered pages may be served from any origin, so `initial_fetch` urls shouldn't be resolved
					return started
						? subsequent_fetch(requested, resolved.href, init)
						: initial_fetch(requested, init);
				},
				setHeaders: () => {}, // noop
				depends,
				parent() {
					uses.parent = true;
					return parent();
				}
			};

			if (DEV) {
				try {
					lock_fetch();
					data = (await node.universal.load.call(null, load_input)) ?? null;
					if (data != null && Object.getPrototypeOf(data) !== Object.prototype) {
						throw new Error(
							`a load function related to route '${route.id}' returned ${
								typeof data !== 'object'
									? `a ${typeof data}`
									: data instanceof Response
									? 'a Response object'
									: Array.isArray(data)
									? 'an array'
									: 'a non-plain object'
							}, but must return a plain object at the top level (i.e. \`return {...}\`)`
						);
					}
				} finally {
					unlock_fetch();
				}
			} else {
				data = (await node.universal.load.call(null, load_input)) ?? null;
			}
			data = data ? await unwrap_promises(data) : null;
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
	 * @param {boolean} parent_changed
	 * @param {boolean} route_changed
	 * @param {boolean} url_changed
	 * @param {import('types').Uses | undefined} uses
	 * @param {Record<string, string>} params
	 */
	function has_changed(parent_changed, route_changed, url_changed, uses, params) {
		if (force_invalidation) return true;

		if (!uses) return false;

		if (uses.parent && parent_changed) return true;
		if (uses.route && route_changed) return true;
		if (uses.url && url_changed) return true;

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
	 * @param {import('./types').DataNode | null} [previous]
	 * @returns {import('./types').DataNode | null}
	 */
	function create_data_node(node, previous) {
		if (node?.type === 'data') return node;
		if (node?.type === 'skip') return previous ?? null;
		return null;
	}

	/**
	 * @param {import('./types').NavigationIntent} intent
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	async function load_route({ id, invalidating, url, params, route }) {
		if (load_cache?.id === id) {
			return load_cache.promise;
		}

		const { errors, layouts, leaf } = route;

		const loaders = [...layouts, leaf];

		// preload modules to avoid waterfall, but handle rejections
		// so they don't get reported to Sentry et al (we don't need
		// to act on the failures at this point)
		errors.forEach((loader) => loader?.().catch(() => {}));
		loaders.forEach((loader) => loader?.[1]().catch(() => {}));

		/** @type {import('types').ServerNodesResponse | import('types').ServerRedirectNode | null} */
		let server_data = null;

		const url_changed = current.url ? id !== current.url.pathname + current.url.search : false;
		const route_changed = current.route ? route.id !== current.route.id : false;

		let parent_invalid = false;
		const invalid_server_nodes = loaders.map((loader, i) => {
			const previous = current.branch[i];

			const invalid =
				!!loader?.[0] &&
				(previous?.loader !== loader[1] ||
					has_changed(parent_invalid, route_changed, url_changed, previous.server?.uses, params));

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
				return load_root_error_page({
					status: error instanceof HttpError ? error.status : 500,
					error: await handle_error(error, { url, params, route: { id: route.id } }),
					url,
					route
				});
			}

			if (server_data.type === 'redirect') {
				return server_data;
			}
		}

		const server_data_nodes = server_data?.nodes;

		let parent_changed = false;

		const branch_promises = loaders.map(async (loader, i) => {
			if (!loader) return;

			/** @type {import('./types').BranchNode | undefined} */
			const previous = current.branch[i];

			const server_data_node = server_data_nodes?.[i];

			// re-use data from previous load if it's still valid
			const valid =
				(!server_data_node || server_data_node.type === 'skip') &&
				loader[1] === previous?.loader &&
				!has_changed(parent_changed, route_changed, url_changed, previous.universal?.uses, params);
			if (valid) return previous;

			parent_changed = true;

			if (server_data_node?.type === 'error') {
				// rethrow and catch below
				throw server_data_node;
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
					server_data_node === undefined && loader[0] ? { type: 'skip' } : server_data_node ?? null,
					loader[0] ? previous?.server : undefined
				)
			});
		});

		// if we don't do this, rejections will be unhandled
		for (const p of branch_promises) p.catch(() => {});

		/** @type {Array<import('./types').BranchNode | undefined>} */
		const branch = [];

		for (let i = 0; i < loaders.length; i += 1) {
			if (loaders[i]) {
				try {
					branch.push(await branch_promises[i]);
				} catch (err) {
					if (err instanceof Redirect) {
						return {
							type: 'redirect',
							location: err.location
						};
					}

					let status = 500;
					/** @type {App.Error} */
					let error;

					if (server_data_nodes?.includes(/** @type {import('types').ServerErrorNode} */ (err))) {
						// this is the server error rethrown above, reconstruct but don't invoke
						// the client error handler; it should've already been handled on the server
						status = /** @type {import('types').ServerErrorNode} */ (err).status ?? status;
						error = /** @type {import('types').ServerErrorNode} */ (err).error;
					} else if (err instanceof HttpError) {
						status = err.status;
						error = err.body;
					} else {
						// Referenced node could have been removed due to redeploy, check
						const updated = await stores.updated.check();
						if (updated) {
							return await native_navigation(url);
						}

						error = await handle_error(err, { params, url, route: { id: route.id } });
					}

					const error_load = await load_nearest_error_page(i, branch, errors);
					if (error_load) {
						return await get_navigation_result_from_branch({
							url,
							params,
							branch: branch.slice(0, error_load.idx).concat(error_load.node),
							status,
							error,
							route
						});
					} else {
						// if we get here, it's because the root `load` function failed,
						// and we need to fall back to the server
						return await server_fallback(url, { id: route.id }, error, status);
					}
				}
			} else {
				// push an empty slot so we can rewind past gaps to the
				// layout that corresponds with an +error.svelte page
				branch.push(undefined);
			}
		}

		return await get_navigation_result_from_branch({
			url,
			params,
			branch,
			status: 200,
			error: null,
			route,
			// Reset `form` on navigation, but not invalidation
			form: invalidating ? undefined : null
		});
	}

	/**
	 * @param {number} i Start index to backtrack from
	 * @param {Array<import('./types').BranchNode | undefined>} branch Branch to backtrack
	 * @param {Array<import('types').CSRPageNodeLoader | undefined>} errors All error pages for this branch
	 * @returns {Promise<{idx: number; node: import('./types').BranchNode} | undefined>}
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
				} catch (e) {
					continue;
				}
			}
		}
	}

	/**
	 * @param {{
	 *   status: number;
	 *   error: App.Error;
	 *   url: URL;
	 *   route: { id: string | null }
	 * }} opts
	 * @returns {Promise<import('./types').NavigationFinished>}
	 */
	async function load_root_error_page({ status, error, url, route }) {
		/** @type {Record<string, string>} */
		const params = {}; // error page does not have params

		/** @type {import('types').ServerDataNode | null} */
		let server_data_node = null;

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
			} catch {
				// at this point we have no choice but to fall back to the server, if it wouldn't
				// bring us right back here, turning this into an endless loop
				if (url.origin !== location.origin || url.pathname !== location.pathname || hydrated) {
					await native_navigation(url);
				}
			}
		}

		const root_layout = await load_node({
			loader: default_layout_loader,
			url,
			params,
			route,
			parent: () => Promise.resolve({}),
			server_data_node: create_data_node(server_data_node)
		});

		/** @type {import('./types').BranchNode} */
		const root_error = {
			node: await default_error_loader(),
			loader: default_error_loader,
			universal: null,
			server: null,
			data: null
		};

		return await get_navigation_result_from_branch({
			url,
			params,
			branch: [root_layout, root_error],
			status,
			error,
			route: null
		});
	}

	/**
	 * @param {URL} url
	 * @param {boolean} invalidating
	 */
	function get_navigation_intent(url, invalidating) {
		if (is_external_url(url, base)) return;

		const path = get_url_path(url);

		for (const route of routes) {
			const params = route.exec(path);

			if (params) {
				const id = url.pathname + url.search;
				/** @type {import('./types').NavigationIntent} */
				const intent = { id, invalidating, route, params: decode_params(params), url };
				return intent;
			}
		}
	}

	/** @param {URL} url */
	function get_url_path(url) {
		return decode_pathname(url.pathname.slice(base.length) || '/');
	}

	/**
	 * @param {{
	 *   url: URL;
	 *   type: import('@sveltejs/kit').NavigationType;
	 *   intent?: import('./types').NavigationIntent;
	 *   delta?: number;
	 * }} opts
	 */
	function before_navigate({ url, type, intent, delta }) {
		let should_block = false;

		/** @type {import('@sveltejs/kit').Navigation} */
		const navigation = {
			from: {
				params: current.params,
				route: { id: current.route?.id ?? null },
				url: current.url
			},
			to: {
				params: intent?.params ?? null,
				route: { id: intent?.route?.id ?? null },
				url
			},
			willUnload: !intent,
			type
		};

		if (delta !== undefined) {
			navigation.delta = delta;
		}

		const cancellable = {
			...navigation,
			cancel: () => {
				should_block = true;
			}
		};

		if (!navigating) {
			// Don't run the event during redirects
			callbacks.before_navigate.forEach((fn) => fn(cancellable));
		}

		return should_block ? null : navigation;
	}

	/**
	 * @param {{
	 *   url: URL;
	 *   scroll: { x: number, y: number } | null;
	 *   keepfocus: boolean;
	 *   redirect_chain: string[];
	 *   details: {
	 *     replaceState: boolean;
	 *     state: any;
	 *   } | null;
	 *   type: import('@sveltejs/kit').NavigationType;
	 *   delta?: number;
	 *   nav_token?: {};
	 *   accepted: () => void;
	 *   blocked: () => void;
	 * }} opts
	 */
	async function navigate({
		url,
		scroll,
		keepfocus,
		redirect_chain,
		details,
		type,
		delta,
		nav_token = {},
		accepted,
		blocked
	}) {
		const intent = get_navigation_intent(url, false);
		const navigation = before_navigate({ url, type, delta, intent });

		if (!navigation) {
			blocked();
			return;
		}

		// store this before calling `accepted()`, which may change the index
		const previous_history_index = current_history_index;

		accepted();

		navigating = true;

		if (started) {
			stores.navigating.set(navigation);
		}

		token = nav_token;
		let navigation_result = intent && (await load_route(intent));

		if (!navigation_result) {
			if (is_external_url(url, base)) {
				return await native_navigation(url);
			}
			navigation_result = await server_fallback(
				url,
				{ id: null },
				await handle_error(new Error(`Not found: ${url.pathname}`), {
					url,
					params: {},
					route: { id: null }
				}),
				404
			);
		}

		// if this is an internal navigation intent, use the normalized
		// URL for the rest of the function
		url = intent?.url || url;

		// abort if user navigated during update
		if (token !== nav_token) return false;

		if (navigation_result.type === 'redirect') {
			if (redirect_chain.length > 10 || redirect_chain.includes(url.pathname)) {
				navigation_result = await load_root_error_page({
					status: 500,
					error: await handle_error(new Error('Redirect loop'), {
						url,
						params: {},
						route: { id: null }
					}),
					url,
					route: { id: null }
				});
			} else {
				goto(
					new URL(navigation_result.location, url).href,
					{},
					[...redirect_chain, url.pathname],
					nav_token
				);
				return false;
			}
		} else if (/** @type {number} */ (navigation_result.props.page?.status) >= 400) {
			const updated = await stores.updated.check();
			if (updated) {
				await native_navigation(url);
			}
		}

		// reset invalidation only after a finished navigation. If there are redirects or
		// additional invalidations, they should get the same invalidation treatment
		invalidated.length = 0;
		force_invalidation = false;

		updating = true;

		update_scroll_positions(previous_history_index);
		capture_snapshot(previous_history_index);

		// ensure the url pathname matches the page's trailing slash option
		if (
			navigation_result.props.page?.url &&
			navigation_result.props.page.url.pathname !== url.pathname
		) {
			url.pathname = navigation_result.props.page?.url.pathname;
		}

		if (details) {
			const change = details.replaceState ? 0 : 1;
			details.state[INDEX_KEY] = current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', url);

			if (!details.replaceState) {
				// if we navigated back, then pushed a new state, we can
				// release memory by pruning the scroll/snapshot lookup
				let i = current_history_index + 1;
				while (snapshots[i] || scroll_positions[i]) {
					delete snapshots[i];
					delete scroll_positions[i];
					i += 1;
				}
			}
		}

		// reset preload synchronously after the history state has been set to avoid race conditions
		load_cache = null;

		if (started) {
			current = navigation_result.state;

			// reset url before updating page store
			if (navigation_result.props.page) {
				navigation_result.props.page.url = url;
			}

			root.$set(navigation_result.props);
		} else {
			initialize(navigation_result);
		}

		const { activeElement } = document;

		// need to render the DOM before we can scroll to the rendered elements and do focus management
		await tick();

		// we reset scroll before dealing with focus, to avoid a flash of unscrolled content
		if (autoscroll) {
			const deep_linked =
				url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
			if (scroll) {
				scrollTo(scroll.x, scroll.y);
			} else if (deep_linked) {
				// Here we use `scrollIntoView` on the element instead of `scrollTo`
				// because it natively supports the `scroll-margin` and `scroll-behavior`
				// CSS properties.
				deep_linked.scrollIntoView();
			} else {
				scrollTo(0, 0);
			}
		}

		const changed_focus =
			// reset focus only if any manual focus management didn't override it
			document.activeElement !== activeElement &&
			// also refocus when activeElement is body already because the
			// focus event might not have been fired on it yet
			document.activeElement !== document.body;

		if (!keepfocus && !changed_focus) {
			reset_focus();
		}

		autoscroll = true;

		if (navigation_result.props.page) {
			page = navigation_result.props.page;
		}

		navigating = false;

		if (type === 'popstate') {
			restore_snapshot(current_history_index);
		}

		callbacks.after_navigate.forEach((fn) =>
			fn(/** @type {import('@sveltejs/kit').AfterNavigate} */ (navigation))
		);
		stores.navigating.set(null);

		updating = false;
	}

	/**
	 * Does a full page reload if it wouldn't result in an endless loop in the SPA case
	 * @param {URL} url
	 * @param {{ id: string | null }} route
	 * @param {App.Error} error
	 * @param {number} status
	 * @returns {Promise<import('./types').NavigationFinished>}
	 */
	async function server_fallback(url, route, error, status) {
		if (url.origin === location.origin && url.pathname === location.pathname && !hydrated) {
			// We would reload the same page we're currently on, which isn't hydrated,
			// which means no SSR, which means we would end up in an endless loop
			return await load_root_error_page({
				status,
				error,
				url,
				route
			});
		}

		if (DEV && status !== 404) {
			console.error(
				'An error occurred while loading the page. This will cause a full page reload. (This message will only appear during development.)'
			);

			debugger; // eslint-disable-line
		}

		return await native_navigation(url);
	}

	/**
	 * Loads `href` the old-fashioned way, with a full page reload.
	 * Returns a `Promise` that never resolves (to prevent any
	 * subsequent work, e.g. history manipulation, from happening)
	 * @param {URL} url
	 */
	function native_navigation(url) {
		location.href = url.href;
		return new Promise(() => {});
	}

	if (import.meta.hot) {
		import.meta.hot.on('vite:beforeUpdate', () => {
			if (current.error) location.reload();
		});
	}

	function setup_preload() {
		/** @type {NodeJS.Timeout} */
		let mousemove_timeout;

		container.addEventListener('mousemove', (event) => {
			const target = /** @type {Element} */ (event.target);

			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				preload(target, 2);
			}, 20);
		});

		/** @param {Event} event */
		function tap(event) {
			preload(/** @type {Element} */ (event.composedPath()[0]), 1);
		}

		container.addEventListener('mousedown', tap);
		container.addEventListener('touchstart', tap, { passive: true });

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						preload_code(
							get_url_path(new URL(/** @type {HTMLAnchorElement} */ (entry.target).href))
						);
						observer.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0 }
		);

		/**
		 * @param {Element} element
		 * @param {number} priority
		 */
		function preload(element, priority) {
			const a = find_anchor(element, container);
			if (!a) return;

			const { url, external, download } = get_link_info(a, base);
			if (external || download) return;

			const options = get_router_options(a);

			if (!options.reload) {
				if (priority <= options.preload_data) {
					const intent = get_navigation_intent(/** @type {URL} */ (url), false);
					if (intent) {
						if (DEV) {
							preload_data(intent).then((result) => {
								if (result.type === 'loaded' && result.state.error) {
									console.warn(
										`Preloading data for ${intent.url.pathname} failed with the following error: ${result.state.error.message}\n` +
											'If this error is transient, you can ignore it. Otherwise, consider disabling preloading for this route. ' +
											'This route was preloaded due to a data-sveltekit-preload-data attribute. ' +
											'See https://kit.svelte.dev/docs/link-options for more info'
									);
								}
							});
						} else {
							preload_data(intent);
						}
					}
				} else if (priority <= options.preload_code) {
					preload_code(get_url_path(/** @type {URL} */ (url)));
				}
			}
		}

		function after_navigate() {
			observer.disconnect();

			for (const a of container.querySelectorAll('a')) {
				const { url, external, download } = get_link_info(a, base);
				if (external || download) continue;

				const options = get_router_options(a);
				if (options.reload) continue;

				if (options.preload_code === PRELOAD_PRIORITIES.viewport) {
					observer.observe(a);
				}

				if (options.preload_code === PRELOAD_PRIORITIES.eager) {
					preload_code(get_url_path(/** @type {URL} */ (url)));
				}
			}
		}

		callbacks.after_navigate.push(after_navigate);
		after_navigate();
	}

	/**
	 * @param {unknown} error
	 * @param {import('@sveltejs/kit').NavigationEvent} event
	 * @returns {import('types').MaybePromise<App.Error>}
	 */
	function handle_error(error, event) {
		if (error instanceof HttpError) {
			return error.body;
		}

		if (DEV) {
			errored = true;
			console.warn('The next HMR update will cause the page to reload');
		}

		return (
			app.hooks.handleError({ error, event }) ??
			/** @type {any} */ ({ message: event.route.id != null ? 'Internal Error' : 'Not Found' })
		);
	}

	return {
		after_navigate: (fn) => {
			onMount(() => {
				callbacks.after_navigate.push(fn);

				return () => {
					const i = callbacks.after_navigate.indexOf(fn);
					callbacks.after_navigate.splice(i, 1);
				};
			});
		},

		before_navigate: (fn) => {
			onMount(() => {
				callbacks.before_navigate.push(fn);

				return () => {
					const i = callbacks.before_navigate.indexOf(fn);
					callbacks.before_navigate.splice(i, 1);
				};
			});
		},

		disable_scroll_handling: () => {
			if (DEV && started && !updating) {
				throw new Error('Can only disable scroll handling during navigation');
			}

			if (updating || !started) {
				autoscroll = false;
			}
		},

		goto: (href, opts = {}) => {
			return goto(href, opts, []);
		},

		invalidate: (resource) => {
			if (typeof resource === 'function') {
				invalidated.push(resource);
			} else {
				const { href } = new URL(resource, location.href);
				invalidated.push((url) => url.href === href);
			}

			return invalidate();
		},

		invalidate_all: () => {
			force_invalidation = true;
			return invalidate();
		},

		preload_data: async (href) => {
			const url = new URL(href, get_base_uri(document));
			const intent = get_navigation_intent(url, false);

			if (!intent) {
				throw new Error(`Attempted to preload a URL that does not belong to this app: ${url}`);
			}

			await preload_data(intent);
		},

		preload_code,

		apply_action: async (result) => {
			if (result.type === 'error') {
				const url = new URL(location.href);

				const { branch, route } = current;
				if (!route) return;

				const error_load = await load_nearest_error_page(
					current.branch.length,
					branch,
					route.errors
				);
				if (error_load) {
					const navigation_result = await get_navigation_result_from_branch({
						url,
						params: current.params,
						branch: branch.slice(0, error_load.idx).concat(error_load.node),
						status: result.status ?? 500,
						error: result.error,
						route
					});

					current = navigation_result.state;

					root.$set(navigation_result.props);

					tick().then(reset_focus);
				}
			} else if (result.type === 'redirect') {
				goto(result.location, { invalidateAll: true }, []);
			} else {
				/** @type {Record<string, any>} */
				root.$set({
					// this brings Svelte's view of the world in line with SvelteKit's
					// after use:enhance reset the form....
					form: null,
					page: { ...page, form: result.data, status: result.status }
				});

				// ...so that setting the `form` prop takes effect and isn't ignored
				await tick();
				root.$set({ form: result.data });

				if (result.type === 'success') {
					reset_focus();
				}
			}
		},

		_start_router: () => {
			history.scrollRestoration = 'manual';

			// Adopted from Nuxt.js
			// Reset scrollRestoration to auto when leaving page, allowing page reload
			// and back-navigation from other pages to use the browser to restore the
			// scrolling position.
			addEventListener('beforeunload', (e) => {
				let should_block = false;

				persist_state();

				if (!navigating) {
					// If we're navigating, beforeNavigate was already called. If we end up in here during navigation,
					// it's due to an external or full-page-reload link, for which we don't want to call the hook again.
					/** @type {import('@sveltejs/kit').BeforeNavigate} */
					const navigation = {
						from: {
							params: current.params,
							route: { id: current.route?.id ?? null },
							url: current.url
						},
						to: null,
						willUnload: true,
						type: 'leave',
						cancel: () => (should_block = true)
					};

					callbacks.before_navigate.forEach((fn) => fn(navigation));
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
				}
			});

			// @ts-expect-error this isn't supported everywhere yet
			if (!navigator.connection?.saveData) {
				setup_preload();
			}

			/** @param {MouseEvent} event */
			container.addEventListener('click', (event) => {
				// Adapted from https://github.com/visionmedia/page.js
				// MIT license https://github.com/visionmedia/page.js#license
				if (event.button || event.which !== 1) return;
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				if (event.defaultPrevented) return;

				const a = find_anchor(/** @type {Element} */ (event.composedPath()[0]), container);
				if (!a) return;

				const { url, external, target, download } = get_link_info(a, base);
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

				// Ignore the following but fire beforeNavigate
				if (external || options.reload) {
					if (before_navigate({ url, type: 'link' })) {
						// set `navigating` to `true` to prevent `beforeNavigate` callbacks
						// being called when the page unloads
						navigating = true;
					} else {
						event.preventDefault();
					}

					return;
				}

				// Check if new url only differs by hash and use the browser default behavior in that case
				// This will ensure the `hashchange` event is fired
				// Removing the hash does a full page navigation in the browser, so make sure a hash is present
				const [nonhash, hash] = url.href.split('#');
				if (hash !== undefined && nonhash === location.href.split('#')[0]) {
					// If we are trying to navigate to the same hash, we should only
					// attempt to scroll to that element and avoid any history changes.
					// Otherwise, this can cause Firefox to incorrectly assign a null
					// history state value without any signal that we can detect.
					if (current.url.hash === url.hash) {
						event.preventDefault();
						a.ownerDocument.getElementById(hash)?.scrollIntoView();
						return;
					}
					// set this flag to distinguish between navigations triggered by
					// clicking a hash link and those triggered by popstate
					hash_navigating = true;

					update_scroll_positions(current_history_index);

					update_url(url);

					if (!options.replace_state) return;

					// hashchange event shouldn't occur if the router is replacing state.
					hash_navigating = false;
					event.preventDefault();
				}

				navigate({
					url,
					scroll: options.noscroll ? scroll_state() : null,
					keepfocus: options.keep_focus ?? false,
					redirect_chain: [],
					details: {
						state: {},
						replaceState: options.replace_state ?? url.href === location.href
					},
					accepted: () => event.preventDefault(),
					blocked: () => event.preventDefault(),
					type: 'link'
				});
			});

			container.addEventListener('submit', (event) => {
				if (event.defaultPrevented) return;

				const form = /** @type {HTMLFormElement} */ (
					HTMLFormElement.prototype.cloneNode.call(event.target)
				);

				const submitter = /** @type {HTMLButtonElement | HTMLInputElement | null} */ (
					event.submitter
				);

				const method = submitter?.formMethod || form.method;

				if (method !== 'get') return;

				const url = new URL(
					(submitter?.hasAttribute('formaction') && submitter?.formAction) || form.action
				);

				if (is_external_url(url, base)) return;

				const event_form = /** @type {HTMLFormElement} */ (event.target);

				const { keep_focus, noscroll, reload, replace_state } = get_router_options(event_form);
				if (reload) return;

				event.preventDefault();
				event.stopPropagation();

				const data = new FormData(event_form);

				const submitter_name = submitter?.getAttribute('name');
				if (submitter_name) {
					data.append(submitter_name, submitter?.getAttribute('value') ?? '');
				}

				// @ts-expect-error `URLSearchParams(fd)` is kosher, but typescript doesn't know that
				url.search = new URLSearchParams(data).toString();

				navigate({
					url,
					scroll: noscroll ? scroll_state() : null,
					keepfocus: keep_focus ?? false,
					redirect_chain: [],
					details: {
						state: {},
						replaceState: replace_state ?? url.href === location.href
					},
					nav_token: {},
					accepted: () => {},
					blocked: () => {},
					type: 'form'
				});
			});

			addEventListener('popstate', async (event) => {
				if (event.state?.[INDEX_KEY]) {
					// if a popstate-driven navigation is cancelled, we need to counteract it
					// with history.go, which means we end up back here, hence this check
					if (event.state[INDEX_KEY] === current_history_index) return;

					const scroll = scroll_positions[event.state[INDEX_KEY]];

					// if the only change is the hash, we don't need to do anything...
					if (current.url.href.split('#')[0] === location.href.split('#')[0]) {
						// ...except handle scroll
						scroll_positions[current_history_index] = scroll_state();
						current_history_index = event.state[INDEX_KEY];
						scrollTo(scroll.x, scroll.y);
						return;
					}

					const delta = event.state[INDEX_KEY] - current_history_index;

					await navigate({
						url: new URL(location.href),
						scroll,
						keepfocus: false,
						redirect_chain: [],
						details: null,
						accepted: () => {
							current_history_index = event.state[INDEX_KEY];
						},
						blocked: () => {
							history.go(-delta);
						},
						type: 'popstate',
						delta
					});
				} else {
					// since popstate event is also emitted when an anchor referencing the same
					// document is clicked, we have to check that the router isn't already handling
					// the navigation. otherwise we would be updating the page store twice.
					if (!hash_navigating) {
						const url = new URL(location.href);
						update_url(url);
					}
				}
			});

			addEventListener('hashchange', () => {
				// if the hashchange happened as a result of clicking on a link,
				// we need to update history, otherwise we have to leave it alone
				if (hash_navigating) {
					hash_navigating = false;
					history.replaceState(
						{ ...history.state, [INDEX_KEY]: ++current_history_index },
						'',
						location.href
					);
				}
			});

			// fix link[rel=icon], because browsers will occasionally try to load relative
			// URLs after a pushState/replaceState, resulting in a 404 — see
			// https://github.com/sveltejs/kit/issues/3748#issuecomment-1125980897
			for (const link of document.querySelectorAll('link')) {
				if (link.rel === 'icon') link.href = link.href; // eslint-disable-line
			}

			addEventListener('pageshow', (event) => {
				// If the user navigates to another site and then uses the back button and
				// bfcache hits, we need to set navigating to null, the site doesn't know
				// the navigation away from it was successful.
				// Info about bfcache here: https://web.dev/bfcache
				if (event.persisted) {
					stores.navigating.set(null);
				}
			});

			/**
			 * @param {URL} url
			 */
			function update_url(url) {
				current.url = url;
				stores.page.set({ ...page, url });
				stores.page.notify();
			}
		},

		_hydrate: async ({
			status = 200,
			error,
			node_ids,
			params,
			route,
			data: server_data_nodes,
			form
		}) => {
			hydrated = true;

			const url = new URL(location.href);

			if (!__SVELTEKIT_EMBEDDED__) {
				// See https://github.com/sveltejs/kit/pull/4935#issuecomment-1328093358 for one motivation
				// of determining the params on the client side.
				({ params = {}, route = { id: null } } = get_navigation_intent(url, false) || {});
			}

			/** @type {import('./types').NavigationFinished | undefined} */
			let result;

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

				/** @type {Array<import('./types').BranchNode | undefined>} */
				const branch = await Promise.all(branch_promises);

				const parsed_route = routes.find(({ id }) => id === route.id);

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
					form,
					route: parsed_route ?? null
				});
			} catch (error) {
				if (error instanceof Redirect) {
					// this is a real edge case — `load` would need to return
					// a redirect but only in the browser
					await native_navigation(new URL(error.location, location.href));
					return;
				}

				result = await load_root_error_page({
					status: error instanceof HttpError ? error.status : 500,
					error: await handle_error(error, { url, params, route }),
					url,
					route
				});
			}

			initialize(result);
		}
	};
}

/**
 * @param {URL} url
 * @param {boolean[]} invalid
 * @returns {Promise<import('types').ServerNodesResponse |import('types').ServerRedirectNode>}
 */
async function load_data(url, invalid) {
	const data_url = new URL(url);
	data_url.pathname = add_data_suffix(url.pathname);
	if (DEV && url.searchParams.has(INVALIDATED_PARAM)) {
		throw new Error(`Cannot used reserved query parameter "${INVALIDATED_PARAM}"`);
	}
	data_url.searchParams.append(INVALIDATED_PARAM, invalid.map((i) => (i ? '1' : '0')).join(''));

	const res = await native_fetch(data_url.href);

	if (!res.ok) {
		// error message is a JSON-stringified string which devalue can't handle at the top level
		// turn it into a HttpError to not call handleError on the client again (was already handled on the server)
		throw new HttpError(res.status, await res.json());
	}

	// TODO: fix eslint error
	// eslint-disable-next-line
	return new Promise(async (resolve) => {
		/**
		 * Map of deferred promises that will be resolved by a subsequent chunk of data
		 * @type {Map<string, import('types').Deferred>}
		 */
		const deferreds = new Map();
		const reader = /** @type {ReadableStream<Uint8Array>} */ (res.body).getReader();
		const decoder = new TextDecoder();

		/**
		 * @param {any} data
		 */
		function deserialize(data) {
			return devalue.unflatten(data, {
				Promise: (id) => {
					return new Promise((fulfil, reject) => {
						deferreds.set(id, { fulfil, reject });
					});
				}
			});
		}

		let text = '';

		while (true) {
			// Format follows ndjson (each line is a JSON object) or regular JSON spec
			const { done, value } = await reader.read();
			if (done && !text) break;

			text += !value && text ? '\n' : decoder.decode(value); // no value -> final chunk -> add a new line to trigger the last parse

			while (true) {
				const split = text.indexOf('\n');
				if (split === -1) {
					break;
				}

				const node = JSON.parse(text.slice(0, split));
				text = text.slice(split + 1);

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
	});

	// TODO edge case handling necessary? stream() read fails?
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
		url: !!uses?.url
	};
}

function reset_focus() {
	const autofocus = document.querySelector('[autofocus]');
	if (autofocus) {
		// @ts-ignore
		autofocus.focus();
	} else {
		// Reset page selection and focus
		// We try to mimic browsers' behaviour as closely as possible by targeting the
		// first scrollable region, but unfortunately it's not a perfect match — e.g.
		// shift-tabbing won't immediately cycle up from the end of the page on Chromium
		// See https://html.spec.whatwg.org/multipage/interaction.html#get-the-focusable-area
		const root = document.body;
		const tabindex = root.getAttribute('tabindex');

		root.tabIndex = -1;
		// @ts-expect-error
		root.focus({ preventScroll: true, focusVisible: false });

		// restore `tabindex` as to prevent `root` from stealing input from elements
		if (tabindex !== null) {
			root.setAttribute('tabindex', tabindex);
		} else {
			root.removeAttribute('tabindex');
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
