import { onMount, tick } from 'svelte';
import { normalize_error } from '../../utils/error.js';
import { LoadURL, decode_params, normalize_path } from '../../utils/url.js';
import { find_anchor, get_base_uri, get_href, scroll_state } from './utils.js';
import { lock_fetch, unlock_fetch, initial_fetch, native_fetch } from './fetcher.js';
import { parse } from './parse.js';
import { error } from '../../index/index.js';

import Root from '__GENERATED__/root.svelte';
import { nodes, dictionary, matchers } from '__GENERATED__/client-manifest.js';
import { HttpError, Redirect } from '../../index/private.js';
import { stores } from './singletons.js';

const SCROLL_KEY = 'sveltekit:scroll';
const INDEX_KEY = 'sveltekit:index';

const routes = parse(nodes, dictionary, matchers);

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

/**
 * @param {{
 *   target: Element;
 *   base: string;
 *   trailing_slash: import('types').TrailingSlash;
 * }} opts
 * @returns {import('./types').Client}
 */
export function create_client({ target, base, trailing_slash }) {
	/** @type {Array<((href: string) => boolean)>} */
	const invalidated = [];

	/** @type {{id: string | null, promise: Promise<import('./types').NavigationResult | undefined> | null}} */
	const load_cache = {
		id: null,
		promise: null
	};

	const callbacks = {
		/** @type {Array<(opts: { from: URL, to: URL | null, cancel: () => void }) => void>} */
		before_navigate: [],

		/** @type {Array<(opts: { from: URL | null, to: URL }) => void>} */
		after_navigate: []
	};

	/** @type {import('./types').NavigationState} */
	let current = {
		branch: [],
		error: null,
		session_id: 0,
		// @ts-ignore - we need the initial value to be null
		url: null
	};

	let started = false;
	let autoscroll = true;
	let updating = false;
	let session_id = 1;

	/** @type {Promise<void> | null} */
	let invalidating = null;

	/** @type {import('svelte').SvelteComponent} */
	let root;

	let router_enabled = true;

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

	/**
	 * @param {string | URL} url
	 * @param {{ noscroll?: boolean; replaceState?: boolean; keepfocus?: boolean; state?: any }} opts
	 * @param {string[]} redirect_chain
	 */
	async function goto(
		url,
		{ noscroll = false, replaceState = false, keepfocus = false, state = {} },
		redirect_chain
	) {
		if (typeof url === 'string') {
			url = new URL(url, get_base_uri(document));
		}

		if (router_enabled) {
			return navigate({
				url,
				scroll: noscroll ? scroll_state() : null,
				keepfocus,
				redirect_chain,
				details: {
					state,
					replaceState
				},
				accepted: () => {},
				blocked: () => {}
			});
		}

		await native_navigation(url);
	}

	/** @param {URL} url */
	async function prefetch(url) {
		const intent = get_navigation_intent(url);

		if (!intent) {
			throw new Error('Attempted to prefetch a URL that does not belong to this app');
		}

		load_cache.promise = load_route(intent);
		load_cache.id = intent.id;

		return load_cache.promise;
	}

	/**
	 * Returns `true` if update completes, `false` if it is aborted
	 * @param {URL} url
	 * @param {string[]} redirect_chain
	 * @param {{hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean, details: { replaceState: boolean, state: any } | null}} [opts]
	 * @param {() => void} [callback]
	 */
	async function update(url, redirect_chain, opts, callback) {
		const intent = get_navigation_intent(url);

		const current_token = (token = {});
		let navigation_result = intent && (await load_route(intent));

		if (
			!navigation_result &&
			url.origin === location.origin &&
			url.pathname === location.pathname
		) {
			// this could happen in SPA fallback mode if the user navigated to
			// `/non-existent-page`. if we fall back to reloading the page, it
			// will create an infinite loop. so whereas we normally handle
			// unknown routes by going to the server, in this special case
			// we render a client-side error page instead
			navigation_result = await load_root_error_page({
				status: 404,
				error: new Error(`Not found: ${url.pathname}`),
				url,
				routeId: null
			});
		}

		if (!navigation_result) {
			await native_navigation(url);
			return false; // unnecessary, but TypeScript prefers it this way
		}

		// if this is an internal navigation intent, use the normalized
		// URL for the rest of the function
		url = intent?.url || url;

		// abort if user navigated during update
		if (token !== current_token) return false;

		invalidated.length = 0;

		if (navigation_result.type === 'redirect') {
			if (redirect_chain.length > 10 || redirect_chain.includes(url.pathname)) {
				navigation_result = await load_root_error_page({
					status: 500,
					error: new Error('Redirect loop'),
					url,
					routeId: null
				});
			} else {
				if (router_enabled) {
					goto(new URL(navigation_result.location, url).href, {}, [
						...redirect_chain,
						url.pathname
					]);
				} else {
					await native_navigation(new URL(navigation_result.location, location.href));
				}

				return false;
			}
		} else if (navigation_result.props?.page?.status >= 400) {
			const updated = await stores.updated.check();
			if (updated) {
				await native_navigation(url);
			}
		}

		updating = true;

		if (opts && opts.details) {
			const { details } = opts;
			const change = details.replaceState ? 0 : 1;
			details.state[INDEX_KEY] = current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', url);
		}

		if (started) {
			current = navigation_result.state;

			if (navigation_result.props.page) {
				navigation_result.props.page.url = url;
			}

			if (import.meta.env.DEV) {
				// Nasty hack to silence harmless warnings the user can do nothing about
				const warn = console.warn;
				console.warn = (...args) => {
					if (
						args.length !== 1 ||
						!/<(Layout|Page)(_[\w$]+)?> was created with unknown prop '(data|errors)'/.test(args[0])
					) {
						warn(...args);
					}
				};
				root.$set(navigation_result.props);
				tick().then(() => (console.warn = warn));
			} else {
				root.$set(navigation_result.props);
			}
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

		load_cache.promise = null;
		load_cache.id = null;
		autoscroll = true;

		if (navigation_result.props.page) {
			page = navigation_result.props.page;
		}

		const leaf_node = navigation_result.state.branch[navigation_result.state.branch.length - 1];
		router_enabled = leaf_node?.node.shared?.router !== false;

		if (callback) callback();

		updating = false;
	}

	/** @param {import('./types').NavigationFinished} result */
	function initialize(result) {
		current = result.state;

		const style = document.querySelector('style[data-sveltekit]');
		if (style) style.remove();

		page = result.props.page;

		if (import.meta.env.DEV) {
			// Nasty hack to silence harmless warnings the user can do nothing about
			const warn = console.warn;
			console.warn = (...args) => {
				if (
					args.length !== 1 ||
					!/<(Layout|Page)(_[\w$]+)?> was created with unknown prop '(data|errors)'/.test(args[0])
				) {
					warn(...args);
				}
			};
			root = new Root({
				target,
				props: { ...result.props, stores },
				hydrate: true
			});
			console.warn = warn;
		} else {
			root = new Root({
				target,
				props: { ...result.props, stores },
				hydrate: true
			});
		}

		if (router_enabled) {
			const navigation = { from: null, to: new URL(location.href) };
			callbacks.after_navigate.forEach((fn) => fn(navigation));
		}

		started = true;
	}

	/**
	 *
	 * @param {{
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   branch: Array<import('./types').BranchNode | undefined>;
	 *   status: number;
	 *   error: HttpError | Error | null;
	 *   routeId: string | null;
	 *   validation_errors?: string | undefined;
	 * }} opts
	 */
	async function get_navigation_result_from_branch({
		url,
		params,
		branch,
		status,
		error,
		routeId,
		validation_errors
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
				session_id
			},
			props: {
				components: filtered.map((branch_node) => branch_node.node.component),
				errors: validation_errors
			}
		};

		let data = {};
		let data_changed = false;
		for (let i = 0; i < filtered.length; i += 1) {
			data = { ...data, ...filtered[i].data };
			// Only set props if the node actually updated. This prevents needless rerenders.
			if (data_changed || !current.branch.some((node) => node === filtered[i])) {
				result.props[`data_${i}`] = data;
				data_changed = true;
			}
		}

		const page_changed =
			!current.url || url.href !== current.url.href || current.error !== error || data_changed;

		if (page_changed) {
			result.props.page = { error, params, routeId, status, url, data };

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

			/** @type {Record<string, string>} */
			const uses_params = {};
			for (const key in params) {
				Object.defineProperty(uses_params, key, {
					get() {
						uses.params.add(key);
						return params[key];
					},
					enumerable: true
				});
			}

			const load_url = new LoadURL(url);

			/** @type {import('types').LoadEvent} */
			const load_input = {
				routeId,
				params: uses_params,
				data: server_data_node?.data ?? null,
				get url() {
					uses.url = true;
					return load_url;
				},
				async fetch(resource, init) {
					let requested;

					if (typeof resource === 'string') {
						requested = resource;
					} else {
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
					}

					// we must fixup relative urls so they are resolved from the target page
					const normalized = new URL(requested, url).href;
					depends(normalized);

					// prerendered pages may be served from any origin, so `initial_fetch` urls shouldn't be normalized
					return started ? native_fetch(normalized, init) : initial_fetch(requested, init);
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
	 * @param {import('types').Uses | undefined} uses
	 * @param {boolean} parent_changed
	 * @param {{ url: boolean, params: string[] }} changed
	 */
	function has_changed(changed, parent_changed, uses) {
		if (!uses) return false;

		if (uses.parent && parent_changed) return true;
		if (changed.url && uses.url) return true;

		for (const param of changed.params) {
			if (uses.params.has(param)) return true;
		}

		for (const dep of uses.dependencies) {
			if (invalidated.some((fn) => fn(dep))) return true;
		}

		return false;
	}

	/**
	 * @param {import('types').ServerDataNode | import('types').ServerDataSkippedNode | null} node
	 * @returns {import('./types').DataNode | null}
	 */
	function create_data_node(node) {
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
		}
		return null;
	}

	/**
	 * @param {import('./types').NavigationIntent} intent
	 * @returns {Promise<import('./types').NavigationResult | undefined>}
	 */
	async function load_route({ id, url, params, route }) {
		if (load_cache.id === id && load_cache.promise) {
			return load_cache.promise;
		}

		const { errors, layouts, leaf } = route;

		const changed = current.url && {
			url: id !== current.url.pathname + current.url.search,
			params: Object.keys(params).filter((key) => current.params[key] !== params[key])
		};

		// preload modules to avoid waterfall, but handle rejections
		// so they don't get reported to Sentry et al (we don't need
		// to act on the failures at this point)
		[...errors, ...layouts, leaf].forEach((loader) => loader?.().catch(() => {}));

		const loaders = [...layouts, leaf];

		// To avoid waterfalls when someone awaits a parent, compute as much as possible here already

		/** @type {import('types').ServerData | null} */
		let server_data = null;

		const invalid_server_nodes = loaders.reduce((acc, loader, i) => {
			const previous = current.branch[i];
			const invalid =
				loader &&
				(previous?.loader !== loader ||
					has_changed(changed, acc.some(Boolean), previous.server?.uses));

			acc.push(invalid);
			return acc;
		}, /** @type {boolean[]} */ ([]));

		if (route.uses_server_data && invalid_server_nodes.some(Boolean)) {
			try {
				const res = await native_fetch(
					`${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}__data.json${url.search}`,
					{
						headers: {
							'x-sveltekit-invalidated': invalid_server_nodes.map((x) => (x ? '1' : '')).join(',')
						}
					}
				);

				server_data = /** @type {import('types').ServerData} */ (await res.json());

				if (!res.ok) {
					throw server_data;
				}
			} catch (e) {
				// something went catastrophically wrong — bail and defer to the server
				native_navigation(url);
				return;
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

			const server_data_node = server_data_nodes?.[i] ?? null;

			const can_reuse_server_data = !server_data_node || server_data_node.type === 'skip';
			// re-use data from previous load if it's still valid
			const valid =
				can_reuse_server_data &&
				loader === previous?.loader &&
				!has_changed(changed, parent_changed, previous.shared?.uses);
			if (valid) return previous;

			parent_changed = true;

			if (server_data_node?.type === 'error') {
				if (server_data_node.httperror) {
					// reconstruct as an HttpError
					throw error(server_data_node.httperror.status, server_data_node.httperror.message);
				} else {
					throw server_data_node.error;
				}
			}

			return load_node({
				loader,
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
				server_data_node: create_data_node(server_data_node) ?? previous?.server ?? null
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
				} catch (e) {
					const error = normalize_error(e);

					if (error instanceof Redirect) {
						return {
							type: 'redirect',
							location: error.location
						};
					}

					const status = e instanceof HttpError ? e.status : 500;

					while (i--) {
						if (errors[i]) {
							/** @type {import('./types').BranchNode | undefined} */
							let error_loaded;

							let j = i;
							while (!branch[j]) j -= 1;

							try {
								error_loaded = {
									node: await errors[i](),
									loader: errors[i],
									data: {},
									server: null,
									shared: null
								};

								return await get_navigation_result_from_branch({
									url,
									params,
									branch: branch.slice(0, j + 1).concat(error_loaded),
									status,
									error,
									routeId: route.id
								});
							} catch (e) {
								continue;
							}
						}
					}

					// if we get here, it's because the root `load` function failed,
					// and we need to fall back to the server
					native_navigation(url);
					return;
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
			routeId: route.id
		});
	}

	/**
	 * @param {{
	 *   status: number;
	 *   error: HttpError | Error;
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
			const res = await native_fetch(
				`${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}__data.json${url.search}`,
				{
					headers: {
						'x-sveltekit-invalidated': '1'
					}
				}
			);

			const server_data_nodes = await res.json();
			server_data_node = server_data_nodes?.[0] ?? null;

			if (!res.ok || server_data_nodes?.type !== 'data') {
				// at this point we have no choice but to fall back to the server
				native_navigation(url);

				// @ts-expect-error
				return;
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
			routeId
		});
	}

	/** @param {URL} url */
	function get_navigation_intent(url) {
		if (url.origin !== location.origin || !url.pathname.startsWith(base)) return;

		const path = decodeURI(url.pathname.slice(base.length) || '/');

		for (const route of routes) {
			const params = route.exec(path);

			if (params) {
				const normalized = new URL(
					url.origin + normalize_path(url.pathname, trailing_slash) + url.search + url.hash
				);
				const id = normalized.pathname + normalized.search;
				/** @type {import('./types').NavigationIntent} */
				const intent = { id, route, params: decode_params(params), url: normalized };
				return intent;
			}
		}
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
	 *   accepted: () => void;
	 *   blocked: () => void;
	 * }} opts
	 */
	async function navigate({ url, scroll, keepfocus, redirect_chain, details, accepted, blocked }) {
		const from = current.url;
		let should_block = false;

		const navigation = {
			from,
			to: url,
			cancel: () => (should_block = true)
		};

		callbacks.before_navigate.forEach((fn) => fn(navigation));

		if (should_block) {
			blocked();
			return;
		}

		update_scroll_positions(current_history_index);

		accepted();

		if (started) {
			stores.navigating.set({
				from: current.url,
				to: url
			});
		}

		await update(
			url,
			redirect_chain,
			{
				scroll,
				keepfocus,
				details
			},
			() => {
				const navigation = { from, to: url };
				callbacks.after_navigate.forEach((fn) => fn(navigation));

				stores.navigating.set(null);
			}
		);
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
				// Force rerun of all load functions, regardless of their dependencies
				for (const node of current.branch) {
					node?.server?.uses.dependencies.add('');
					node?.shared?.uses.dependencies.add('');
				}
				invalidated.push(() => true);
			} else if (typeof resource === 'function') {
				invalidated.push(resource);
			} else {
				const { href } = new URL(resource, location.href);
				invalidated.push((dep) => dep === href);
			}

			if (!invalidating) {
				invalidating = Promise.resolve().then(async () => {
					await update(new URL(location.href), []);

					invalidating = null;
				});
			}

			return invalidating;
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
				return Promise.all([...r.layouts, r.leaf].map((load) => load?.()));
			});

			await Promise.all(promises);
		},

		_start_router: () => {
			history.scrollRestoration = 'manual';

			// Adopted from Nuxt.js
			// Reset scrollRestoration to auto when leaving page, allowing page reload
			// and back-navigation from other pages to use the browser to restore the
			// scrolling position.
			addEventListener('beforeunload', (e) => {
				let should_block = false;

				const navigation = {
					from: current.url,
					to: null,
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
				const a = find_anchor(event);
				if (a && a.href && a.hasAttribute('sveltekit:prefetch')) {
					prefetch(get_href(a));
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
				if (!router_enabled) return;

				// Adapted from https://github.com/visionmedia/page.js
				// MIT license https://github.com/visionmedia/page.js#license
				if (event.button || event.which !== 1) return;
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
				if (event.defaultPrevented) return;

				const a = find_anchor(event);
				if (!a) return;

				if (!a.href) return;

				const is_svg_a_element = a instanceof SVGAElement;
				const url = get_href(a);

				// Ignore non-HTTP URL protocols (e.g. `mailto:`, `tel:`, `myapp:`, etc.)
				// MEMO: Without this condition, firefox will open mailer twice.
				// See:
				// - https://github.com/sveltejs/kit/issues/4045
				// - https://github.com/sveltejs/kit/issues/5725
				if (!is_svg_a_element && !(url.protocol === 'https:' || url.protocol === 'http:')) return;

				// Ignore if tag has
				// 1. 'download' attribute
				// 2. 'rel' attribute includes external
				const rel = (a.getAttribute('rel') || '').split(/\s+/);

				if (
					a.hasAttribute('download') ||
					rel.includes('external') ||
					a.hasAttribute('sveltekit:reload')
				) {
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
					hash_navigating = true;

					update_scroll_positions(current_history_index);

					stores.page.set({ ...page, url });
					stores.page.notify();

					return;
				}

				navigate({
					url,
					scroll: a.hasAttribute('sveltekit:noscroll') ? scroll_state() : null,
					keepfocus: false,
					redirect_chain: [],
					details: {
						state: {},
						replaceState: url.href === location.href
					},
					accepted: () => event.preventDefault(),
					blocked: () => event.preventDefault()
				});
			});

			addEventListener('popstate', (event) => {
				if (event.state && router_enabled) {
					// if a popstate-driven navigation is cancelled, we need to counteract it
					// with history.go, which means we end up back here, hence this check
					if (event.state[INDEX_KEY] === current_history_index) return;

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
							const delta = current_history_index - event.state[INDEX_KEY];
							history.go(delta);
						}
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

		_hydrate: async ({ status, error, node_ids, params, routeId }) => {
			const url = new URL(location.href);

			/** @type {import('./types').NavigationFinished | undefined} */
			let result;

			try {
				/**
				 * @param {string} type
				 * @param {any} fallback
				 */
				const parse = (type, fallback) => {
					const script = document.querySelector(`script[sveltekit\\:data-type="${type}"]`);
					return script?.textContent ? JSON.parse(script.textContent) : fallback;
				};
				/**
				 * @type {Array<import('types').ServerDataNode | null>}
				 * On initial navigation, this will only consist of data nodes or `null`.
				 * A possible error is passed through the `error` property, in which case
				 * the last entry of `node_ids` is an error page and the last entry of
				 * `server_data_nodes` is `null`.
				 */
				const server_data_nodes = parse('server_data', []);
				const validation_errors = parse('validation_errors', undefined);

				const branch_promises = node_ids.map(async (n, i) => {
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
						server_data_node: create_data_node(server_data_nodes[i])
					});
				});

				result = await get_navigation_result_from_branch({
					url,
					params,
					branch: await Promise.all(branch_promises),
					status,
					error: /** @type {import('../server/page/types').SerializedHttpError} */ (error)
						?.__is_http_error
						? new HttpError(
								/** @type {import('../server/page/types').SerializedHttpError} */ (error).status,
								error.message
						  )
						: error,
					validation_errors,
					routeId
				});
			} catch (e) {
				const error = normalize_error(e);

				if (error instanceof Redirect) {
					// this is a real edge case — `load` would need to return
					// a redirect but only in the browser
					await native_navigation(new URL(/** @type {Redirect} */ (e).location, location.href));
					return;
				}

				result = await load_root_error_page({
					status: error instanceof HttpError ? error.status : 500,
					error,
					url,
					routeId
				});
			}

			initialize(result);
		}
	};
}
