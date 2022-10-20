import { onMount, tick } from 'svelte';
import { make_trackable, decode_params, normalize_path } from '../../utils/url.js';
import { find_anchor, get_base_uri, scroll_state } from './utils.js';
import {
	lock_fetch,
	unlock_fetch,
	initial_fetch,
	subsequent_fetch,
	native_fetch
} from './fetcher.js';
import { parse } from './parse.js';

import Root from '__GENERATED__/root.svelte';
import { nodes, server_loads, dictionary, matchers, hooks } from '__GENERATED__/client-manifest.js';
import { HttpError, Redirect } from '../control.js';
import { stores } from './singletons.js';
import { DATA_SUFFIX } from '../../constants.js';
import { unwrap_promises } from '../../utils/promises.js';
import * as devalue from 'devalue';

const SCROLL_KEY = 'sveltekit:scroll';
const INDEX_KEY = 'sveltekit:index';

const routes = parse(nodes, server_loads, dictionary, matchers);

const default_layout_loader = nodes[0];
const default_error_loader = nodes[1];

// we import the root layout/error nodes eagerly, so that
// connectivity errors after initialisation don't nuke the app
default_layout_loader();
default_error_loader();

// We track the scroll position associated with each history entry in sessionStorage,
// rather than on history.state itself, because when navigation is driven by
// popstate it's too late to update the scroll position associated with the
// state we're navigating from

/** @typedef {{ x: number, y: number }} ScrollPosition */
/** @type {Record<number, ScrollPosition>} */
let scroll_positions = {};
try {
	scroll_positions = JSON.parse(sessionStorage[SCROLL_KEY]);
} catch {
	// do nothing
}

/** @param {number} index */
function update_scroll_positions(index) {
	scroll_positions[index] = scroll_state();
}

// TODO remove for 1.0
/** @type {Record<string, true>} */
let warned_about_attributes = {};

function check_for_removed_attributes() {
	const attrs = ['prefetch', 'noscroll', 'reload'];
	for (const attr of attrs) {
		if (document.querySelector(`[sveltekit\\:${attr}]`)) {
			if (!warned_about_attributes[attr]) {
				warned_about_attributes[attr] = true;
				console.error(
					`The sveltekit:${attr} attribute has been replaced with data-sveltekit-${attr}`
				);
			}
		}
	}
}

/**
 * @param {{
 *   target: Element;
 *   base: string;
 *   trailing_slash: import('types').TrailingSlash;
 * }} opts
 * @returns {import('./types').Client}
 */
export function create_client({ target, base, trailing_slash }) {
	/** @type {Array<((url: URL) => boolean)>} */
	const invalidated = [];

	/** @type {{id: string, promise: Promise<import('./types').NavigationResult | undefined>} | null} */
	let load_cache = null;

	const callbacks = {
		/** @type {Array<(navigation: import('types').Navigation & { cancel: () => void }) => void>} */
		before_navigate: [],

		/** @type {Array<(navigation: import('types').Navigation) => void>} */
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

	let hash_navigating = false;

	/** @type {import('types').Page} */
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
		pending_invalidate = null;

		const url = new URL(location.href);
		const intent = get_navigation_intent(url, true);
		// Clear prefetch, it might be affected by the invalidation.
		// Also solves an edge case where a prefetch is triggered, the navigation for it
		// was then triggered and is still running while the invalidation kicks in,
		// at which point the invalidation should take over and "win".
		load_cache = null;
		await update(intent, url, []);
	}

	/**
	 * @param {string | URL} url
	 * @param {{ noscroll?: boolean; replaceState?: boolean; keepfocus?: boolean; state?: any }} opts
	 * @param {string[]} redirect_chain
	 * @param {{}} [nav_token]
	 */
	async function goto(
		url,
		{ noscroll = false, replaceState = false, keepfocus = false, state = {} },
		redirect_chain,
		nav_token
	) {
		if (typeof url === 'string') {
			url = new URL(url, get_base_uri(document));
		}

		return navigate({
			url,
			scroll: noscroll ? scroll_state() : null,
			keepfocus,
			redirect_chain,
			details: {
				state,
				replaceState
			},
			nav_token,
			accepted: () => {},
			blocked: () => {},
			type: 'goto'
		});
	}

	/** @param {URL} url */
	async function prefetch(url) {
		const intent = get_navigation_intent(url, false);

		if (!intent) {
			throw new Error(`Attempted to prefetch a URL that does not belong to this app: ${url}`);
		}

		load_cache = { id: intent.id, promise: load_route(intent) };

		return load_cache.promise;
	}

	/**
	 * Returns `true` if update completes, `false` if it is aborted
	 * @param {import('./types').NavigationIntent | undefined} intent
	 * @param {URL} url
	 * @param {string[]} redirect_chain
	 * @param {{hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean, details: { replaceState: boolean, state: any } | null}} [opts]
	 * @param {{}} [nav_token] To distinguish between different navigation events and determine the latest. Needed for example for redirects to keep the original token
	 * @param {() => void} [callback]
	 */
	async function update(intent, url, redirect_chain, opts, nav_token = {}, callback) {
		token = nav_token;
		let navigation_result = intent && (await load_route(intent));

		if (!navigation_result) {
			navigation_result = await server_fallback(
				url,
				null,
				handle_error(new Error(`Not found: ${url.pathname}`), { url, params: {}, routeId: null }),
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
					error: handle_error(new Error('Redirect loop'), { url, params: {}, routeId: null }),
					url,
					routeId: null
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
		} else if (navigation_result.props?.page?.status >= 400) {
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

		if (opts && opts.details) {
			const { details } = opts;
			const change = details.replaceState ? 0 : 1;
			details.state[INDEX_KEY] = current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', url);
		}

		// reset prefetch synchronously after the history state has been set to avoid race conditions
		load_cache = null;

		if (started) {
			current = navigation_result.state;

			if (navigation_result.props.page) {
				navigation_result.props.page.url = url;
			}

			const post_update = pre_update();
			root.$set(navigation_result.props);
			post_update();
		} else {
			initialize(navigation_result);
		}

		// opts must be passed if we're navigating
		if (opts) {
			const { scroll, keepfocus } = opts;

			if (!keepfocus) {
				// Reset page selection and focus
				// We try to mimic browsers' behaviour as closely as possible by targeting the
				// first scrollable region, but unfortunately it's not a perfect match — e.g.
				// shift-tabbing won't immediately cycle up from the end of the page on Chromium
				// See https://html.spec.whatwg.org/multipage/interaction.html#get-the-focusable-area
				const root = document.body;
				const tabindex = root.getAttribute('tabindex');

				root.tabIndex = -1;
				root.focus({ preventScroll: true });

				setTimeout(() => {
					getSelection()?.removeAllRanges();
				});

				// restore `tabindex` as to prevent `root` from stealing input from elements
				if (tabindex !== null) {
					root.setAttribute('tabindex', tabindex);
				} else {
					root.removeAttribute('tabindex');
				}
			}

			// need to render the DOM before we can scroll to the rendered elements
			await tick();

			if (autoscroll) {
				const deep_linked = url.hash && document.getElementById(url.hash.slice(1));
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
		} else {
			// in this case we're simply invalidating
			await tick();
		}

		autoscroll = true;

		if (navigation_result.props.page) {
			page = navigation_result.props.page;
		}

		if (callback) callback();

		updating = false;
	}

	/** @param {import('./types').NavigationFinished} result */
	function initialize(result) {
		current = result.state;

		const style = document.querySelector('style[data-sveltekit]');
		if (style) style.remove();

		page = result.props.page;

		const post_update = pre_update();
		root = new Root({
			target,
			props: { ...result.props, stores },
			hydrate: true
		});
		post_update();

		/** @type {import('types').Navigation} */
		const navigation = {
			from: null,
			to: add_url_properties('to', {
				params: current.params,
				routeId: current.route?.id ?? null,
				url: new URL(location.href)
			}),
			type: 'load'
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
		const filtered = /** @type {import('./types').BranchNode[] } */ (branch.filter(Boolean));

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
				components: filtered.map((branch_node) => branch_node.node.component)
			}
		};

		if (form !== undefined) {
			result.props.form = form;
		}

		let data = {};
		let data_changed = !page;
		for (let i = 0; i < filtered.length; i += 1) {
			const node = filtered[i];
			data = { ...data, ...node.data };

			// Only set props if the node actually updated. This prevents needless rerenders.
			if (data_changed || !current.branch.some((previous) => previous === node)) {
				result.props[`data_${i}`] = data;
				data_changed = data_changed || Object.keys(node.data ?? {}).length > 0;
			}
		}
		if (!data_changed) {
			// If nothing was added, and the object entries are the same length, this means
			// that nothing was removed either and therefore the data is the same as the previous one.
			// This would be more readable with a separate boolean but that would cost us some bytes.
			data_changed = Object.keys(page.data).length !== Object.keys(data).length;
		}

		const page_changed =
			!current.url ||
			url.href !== current.url.href ||
			current.error !== error ||
			form !== undefined ||
			data_changed;

		if (page_changed) {
			result.props.page = {
				error,
				params,
				routeId: route && route.id,
				status,
				url,
				form,
				// The whole page store is updated, but this way the object reference stays the same
				data: data_changed ? data : page.data
			};

			// TODO remove this for 1.0
			/**
			 * @param {string} property
			 * @param {string} replacement
			 */
			const print_error = (property, replacement) => {
				Object.defineProperty(result.props.page, property, {
					get: () => {
						throw new Error(`$page.${property} has been replaced by $page.url.${replacement}`);
					}
				});
			};

			print_error('origin', 'origin');
			print_error('path', 'pathname');
			print_error('query', 'searchParams');
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
	 *   routeId: string | null;
	 * 	 server_data_node: import('./types').DataNode | null;
	 * }} options
	 * @returns {Promise<import('./types').BranchNode>}
	 */
	async function load_node({ loader, parent, url, params, routeId, server_data_node }) {
		/** @type {Record<string, any> | null} */
		let data = null;

		/** @type {import('types').Uses} */
		const uses = {
			dependencies: new Set(),
			params: new Set(),
			parent: false,
			url: false
		};

		const node = await loader();

		if (node.shared?.load) {
			/** @param {string[]} deps */
			function depends(...deps) {
				for (const dep of deps) {
					const { href } = new URL(dep, url);
					uses.dependencies.add(href);
				}
			}

			/** @type {import('types').LoadEvent} */
			const load_input = {
				routeId,
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
					const resolved = new URL(requested, url).href;
					depends(resolved);

					// prerendered pages may be served from any origin, so `initial_fetch` urls shouldn't be resolved
					return started
						? subsequent_fetch(resolved, init)
						: initial_fetch(requested, resolved, init);
				},
				setHeaders: () => {}, // noop
				depends,
				parent() {
					uses.parent = true;
					return parent();
				}
			};

			// TODO remove this for 1.0
			Object.defineProperties(load_input, {
				props: {
					get() {
						throw new Error(
							'@migration task: Replace `props` with `data` stuff https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693'
						);
					},
					enumerable: false
				},
				session: {
					get() {
						throw new Error(
							'session is no longer available. See https://github.com/sveltejs/kit/discussions/5883'
						);
					},
					enumerable: false
				},
				stuff: {
					get() {
						throw new Error(
							'@migration task: Remove stuff https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693'
						);
					},
					enumerable: false
				}
			});

			if (import.meta.env.DEV) {
				try {
					lock_fetch();
					data = (await node.shared.load.call(null, load_input)) ?? null;
				} finally {
					unlock_fetch();
				}
			} else {
				data = (await node.shared.load.call(null, load_input)) ?? null;
			}
			data = data ? await unwrap_promises(data) : null;
		}

		return {
			node,
			loader,
			server: server_data_node,
			shared: node.shared?.load ? { type: 'data', data, uses } : null,
			data: data ?? server_data_node?.data ?? null
		};
	}

	/**
	 * @param {boolean} url_changed
	 * @param {boolean} parent_changed
	 * @param {import('types').Uses | undefined} uses
	 * @param {Record<string, string>} params
	 */
	function has_changed(url_changed, parent_changed, uses, params) {
		if (force_invalidation) return true;

		if (!uses) return false;

		if (uses.parent && parent_changed) return true;
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
		if (node?.type === 'data') {
			return {
				type: 'data',
				data: node.data,
				uses: {
					dependencies: new Set(node.uses.dependencies ?? []),
					params: new Set(node.uses.params ?? []),
					parent: !!node.uses.parent,
					url: !!node.uses.url
				}
			};
		} else if (node?.type === 'skip') {
			return previous ?? null;
		}
		return null;
	}

	/**
	 * @param {import('./types').NavigationIntent} intent
	 * @returns {Promise<import('./types').NavigationResult | undefined>}
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

		/** @type {import('types').ServerData | null} */
		let server_data = null;

		const url_changed = current.url ? id !== current.url.pathname + current.url.search : false;

		const invalid_server_nodes = loaders.reduce((acc, loader, i) => {
			const previous = current.branch[i];

			const invalid =
				!!loader?.[0] &&
				(previous?.loader !== loader[1] ||
					has_changed(url_changed, acc.some(Boolean), previous.server?.uses, params));

			acc.push(invalid);
			return acc;
		}, /** @type {boolean[]} */ ([]));

		if (invalid_server_nodes.some(Boolean)) {
			try {
				server_data = await load_data(url, invalid_server_nodes);
			} catch (error) {
				return load_root_error_page({
					status: 500,
					error: handle_error(error, { url, params, routeId: route.id }),
					url,
					routeId: route.id
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
				!has_changed(url_changed, parent_changed, previous.shared?.uses, params);
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
				routeId: route.id,
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
					previous?.server
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
						error = handle_error(err, { params, url, routeId: route.id });
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
						return await server_fallback(url, route.id, error, status);
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
							shared: null
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
	 *   routeId: string | null
	 * }} opts
	 * @returns {Promise<import('./types').NavigationFinished>}
	 */
	async function load_root_error_page({ status, error, url, routeId }) {
		/** @type {Record<string, string>} */
		const params = {}; // error page does not have params

		const node = await default_layout_loader();

		/** @type {import('types').ServerDataNode | null} */
		let server_data_node = null;

		if (node.server) {
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
			routeId,
			parent: () => Promise.resolve({}),
			server_data_node: create_data_node(server_data_node)
		});

		/** @type {import('./types').BranchNode} */
		const root_error = {
			node: await default_error_loader(),
			loader: default_error_loader,
			shared: null,
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
		if (is_external_url(url)) return;

		const path = decodeURI(url.pathname.slice(base.length) || '/');

		for (const route of routes) {
			const params = route.exec(path);

			if (params) {
				const normalized = new URL(
					url.origin + normalize_path(url.pathname, trailing_slash) + url.search + url.hash
				);
				const id = normalized.pathname + normalized.search;
				/** @type {import('./types').NavigationIntent} */
				const intent = { id, invalidating, route, params: decode_params(params), url: normalized };
				return intent;
			}
		}
	}

	/** @param {URL} url */
	function is_external_url(url) {
		return url.origin !== location.origin || !url.pathname.startsWith(base);
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
	 *   type: import('types').NavigationType;
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
		nav_token,
		accepted,
		blocked
	}) {
		let should_block = false;

		const intent = get_navigation_intent(url, false);

		/** @type {import('types').Navigation} */
		const navigation = {
			from: add_url_properties('from', {
				params: current.params,
				routeId: current.route?.id ?? null,
				url: current.url
			}),
			to: add_url_properties('to', {
				params: intent?.params ?? null,
				routeId: intent?.route.id ?? null,
				url
			}),
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

		callbacks.before_navigate.forEach((fn) => fn(cancellable));

		if (should_block) {
			blocked();
			return;
		}

		update_scroll_positions(current_history_index);

		accepted();

		if (started) {
			stores.navigating.set(navigation);
		}

		await update(
			intent,
			url,
			redirect_chain,
			{
				scroll,
				keepfocus,
				details
			},
			nav_token,
			() => {
				callbacks.after_navigate.forEach((fn) => fn(navigation));
				stores.navigating.set(null);
			}
		);
	}

	/**
	 * Does a full page reload if it wouldn't result in an endless loop in the SPA case
	 * @param {URL} url
	 * @param {string | null} routeId
	 * @param {App.Error} error
	 * @param {number} status
	 * @returns {Promise<import('./types').NavigationFinished>}
	 */
	async function server_fallback(url, routeId, error, status) {
		if (url.origin === location.origin && url.pathname === location.pathname && !hydrated) {
			// We would reload the same page we're currently on, which isn't hydrated,
			// which means no SSR, which means we would end up in an endless loop
			return await load_root_error_page({
				status,
				error,
				url,
				routeId
			});
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
			if (import.meta.env.DEV && started && !updating) {
				throw new Error('Can only disable scroll handling during navigation');
			}

			if (updating || !started) {
				autoscroll = false;
			}
		},

		goto: (href, opts = {}) => goto(href, opts, []),

		invalidate: (resource) => {
			if (resource === undefined) {
				// TODO remove for 1.0
				throw new Error(
					'`invalidate()` (with no arguments) has been replaced by `invalidateAll()`'
				);
			}

			if (typeof resource === 'function') {
				invalidated.push(resource);
			} else {
				const { href } = new URL(resource, location.href);
				invalidated.push((url) => url.href === href);
			}

			return invalidate();
		},

		invalidateAll: () => {
			force_invalidation = true;
			return invalidate();
		},

		prefetch: async (href) => {
			const url = new URL(href, get_base_uri(document));
			await prefetch(url);
		},

		// TODO rethink this API
		prefetch_routes: async (pathnames) => {
			const matching = pathnames
				? routes.filter((route) => pathnames.some((pathname) => route.exec(pathname)))
				: routes;

			const promises = matching.map((r) => {
				return Promise.all([...r.layouts, r.leaf].map((load) => load?.[1]()));
			});

			await Promise.all(promises);
		},

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
						status: 500, // TODO might not be 500?
						error: result.error,
						route
					});

					current = navigation_result.state;

					const post_update = pre_update();
					root.$set(navigation_result.props);
					post_update();
				}
			} else if (result.type === 'redirect') {
				goto(result.location, {}, []);
			} else {
				/** @type {Record<string, any>} */
				const props = {
					form: result.data,
					page: { ...page, form: result.data, status: result.status }
				};
				const post_update = pre_update();
				root.$set(props);
				post_update();
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

				/** @type {import('types').Navigation & { cancel: () => void }} */
				const navigation = {
					from: add_url_properties('from', {
						params: current.params,
						routeId: current.route?.id ?? null,
						url: current.url
					}),
					to: null,
					type: 'unload',
					cancel: () => (should_block = true)
				};

				callbacks.before_navigate.forEach((fn) => fn(navigation));

				if (should_block) {
					e.preventDefault();
					e.returnValue = '';
				} else {
					history.scrollRestoration = 'auto';
				}
			});

			addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') {
					update_scroll_positions(current_history_index);

					try {
						sessionStorage[SCROLL_KEY] = JSON.stringify(scroll_positions);
					} catch {
						// do nothing
					}
				}
			});

			/** @param {Event} event */
			const trigger_prefetch = (event) => {
				const { url, options } = find_anchor(event);
				if (url && options.prefetch) {
					if (is_external_url(url)) return;
					prefetch(url);
				}
			};

			/** @type {NodeJS.Timeout} */
			let mousemove_timeout;

			/** @param {MouseEvent|TouchEvent} event */
			const handle_mousemove = (event) => {
				clearTimeout(mousemove_timeout);
				mousemove_timeout = setTimeout(() => {
					// event.composedPath(), which is used in find_anchor, will be empty if the event is read in a timeout
					// add a layer of indirection to address that
					event.target?.dispatchEvent(
						new CustomEvent('sveltekit:trigger_prefetch', { bubbles: true })
					);
				}, 20);
			};

			addEventListener('touchstart', trigger_prefetch);
			addEventListener('mousemove', handle_mousemove);
			addEventListener('sveltekit:trigger_prefetch', trigger_prefetch);

			/** @param {MouseEvent} event */
			addEventListener('click', (event) => {
				// Adapted from https://github.com/visionmedia/page.js
				// MIT license https://github.com/visionmedia/page.js#license
				if (event.button || event.which !== 1) return;
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				if (event.defaultPrevented) return;

				const { a, url, options } = find_anchor(event);
				if (!a || !url) return;

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

				// Ignore if tag has
				// 1. 'download' attribute
				// 2. 'rel' attribute includes external
				const rel = (a.getAttribute('rel') || '').split(/\s+/);

				if (a.hasAttribute('download') || rel.includes('external') || options.reload) {
					return;
				}

				// Ignore if <a> has a target
				if (is_svg_a_element ? a.target.baseVal : a.target) return;

				// Check if new url only differs by hash and use the browser default behavior in that case
				// This will ensure the `hashchange` event is fired
				// Removing the hash does a full page navigation in the browser, so make sure a hash is present
				const [base, hash] = url.href.split('#');
				if (hash !== undefined && base === location.href.split('#')[0]) {
					// set this flag to distinguish between navigations triggered by
					// clicking a hash link and those triggered by popstate
					// TODO why not update history here directly?
					hash_navigating = true;

					update_scroll_positions(current_history_index);

					current.url = url;
					stores.page.set({ ...page, url });
					stores.page.notify();

					return;
				}

				navigate({
					url,
					scroll: options.noscroll ? scroll_state() : null,
					keepfocus: false,
					redirect_chain: [],
					details: {
						state: {},
						replaceState: url.href === location.href
					},
					accepted: () => event.preventDefault(),
					blocked: () => event.preventDefault(),
					type: 'link'
				});
			});

			addEventListener('popstate', (event) => {
				if (event.state) {
					// if a popstate-driven navigation is cancelled, we need to counteract it
					// with history.go, which means we end up back here, hence this check
					if (event.state[INDEX_KEY] === current_history_index) return;

					const delta = event.state[INDEX_KEY] - current_history_index;

					navigate({
						url: new URL(location.href),
						scroll: scroll_positions[event.state[INDEX_KEY]],
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
				if (link.rel === 'icon') link.href = link.href;
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
		},

		_hydrate: async ({
			status,
			error,
			node_ids,
			params,
			routeId,
			data: server_data_nodes,
			form
		}) => {
			hydrated = true;

			const url = new URL(location.href);

			/** @type {import('./types').NavigationFinished | undefined} */
			let result;

			try {
				const branch_promises = node_ids.map(async (n, i) => {
					const server_data_node = server_data_nodes[i];

					return load_node({
						loader: nodes[n],
						url,
						params,
						routeId,
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

				result = await get_navigation_result_from_branch({
					url,
					params,
					branch: await Promise.all(branch_promises),
					status,
					error,
					form,
					route: routes.find((route) => route.id === routeId) ?? null
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
					error: handle_error(error, { url, params, routeId }),
					url,
					routeId
				});
			}

			initialize(result);
		}
	};
}

/**
 * @param {URL} url
 * @param {boolean[]} invalid
 * @returns {Promise<import('types').ServerData>}
 */
async function load_data(url, invalid) {
	const data_url = new URL(url);
	data_url.pathname = url.pathname.replace(/\/$/, '') + DATA_SUFFIX;

	const res = await native_fetch(data_url.href, {
		headers: {
			'x-sveltekit-invalidated': invalid.map((x) => (x ? '1' : '')).join(',')
		}
	});
	const server_data = await res.text();

	if (!res.ok) {
		// error message is a JSON-stringified string which devalue can't handle at the top level
		throw new Error(JSON.parse(server_data));
	}

	return devalue.parse(server_data);
}

/**
 * @param {unknown} error
 * @param {import('types').NavigationEvent} event
 * @returns {App.Error}
 */
function handle_error(error, event) {
	if (error instanceof HttpError) {
		return error.body;
	}
	return (
		hooks.handleError({ error, event }) ??
		/** @type {any} */ ({ message: event.routeId != null ? 'Internal Error' : 'Not Found' })
	);
}

// TODO remove for 1.0
const properties = [
	'hash',
	'href',
	'host',
	'hostname',
	'origin',
	'pathname',
	'port',
	'protocol',
	'search',
	'searchParams',
	'toString',
	'toJSON'
];

/**
 * @param {'from' | 'to'} type
 * @param {import('types').NavigationTarget} target
 */
function add_url_properties(type, target) {
	for (const prop of properties) {
		Object.defineProperty(target, prop, {
			get() {
				throw new Error(
					`The navigation shape changed - ${type}.${prop} should now be ${type}.url.${prop}`
				);
			},
			enumerable: false
		});
	}

	return target;
}

function pre_update() {
	if (__SVELTEKIT_DEV__) {
		return () => {
			check_for_removed_attributes();
		};
	}

	return () => {};
}

if (__SVELTEKIT_DEV__) {
	// Nasty hack to silence harmless warnings the user can do nothing about
	const warn = console.warn;
	console.warn = (...args) => {
		if (
			args.length === 1 &&
			/<(Layout|Page)(_[\w$]+)?> was created (with unknown|without expected) prop '(data|form)'/.test(
				args[0]
			)
		) {
			return;
		}
		warn(...args);
	};
}
