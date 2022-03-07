import { onMount, tick } from 'svelte';
import { writable } from 'svelte/store';
import { coalesce_to_error } from '../../utils/error.js';
import { normalize } from '../load.js';
import { normalize_path } from '../../utils/url';
import {
	create_updated_store,
	find_anchor,
	get_base_uri,
	get_href,
	initial_fetch,
	notifiable_store,
	scroll_state
} from './utils';

import Root from '__GENERATED__/root.svelte';
import { routes, fallback } from '__GENERATED__/manifest.js';

const SCROLL_KEY = 'sveltekit:scroll';
const INDEX_KEY = 'sveltekit:index';

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
 *   session: App.Session;
 *   base: string;
 *   trailing_slash: import('types').TrailingSlash;
 * }} opts
 * @returns {import('./types').Client}
 */
export function create_client({ target, session, base, trailing_slash }) {
	/** @type {Map<string, import('./types').NavigationResult>} */
	const cache = new Map();

	/** @type {Set<string>} */
	const invalidated = new Set();

	const stores = {
		url: notifiable_store({}),
		page: notifiable_store({}),
		navigating: writable(/** @type {import('types').Navigation | null} */ (null)),
		session: writable(session),
		updated: create_updated_store()
	};

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
		// @ts-ignore - we need the initial value to be null
		url: null,
		session_id: 0,
		branch: []
	};

	let started = false;
	let autoscroll = true;
	let updating = false;
	let session_id = 1;

	/** @type {Promise<void> | null} */
	let invalidating = null;

	/** @type {import('svelte').SvelteComponent} */
	let root;

	/** @type {App.Session} */
	let $session;

	let ready = false;
	stores.session.subscribe(async (value) => {
		$session = value;

		if (!ready) return;
		session_id += 1;

		const intent = get_navigation_intent(new URL(location.href));
		update(intent, [], true);
	});
	ready = true;

	/** Keeps tracks of multiple navigations caused by redirects during rendering */
	let navigating = 0;

	let router_enabled = true;

	// keeping track of the history index in order to prevent popstate navigation events if needed
	let current_history_index = history.state?.[INDEX_KEY] ?? 0;

	if (current_history_index === 0) {
		// create initial history entry, so we can return here
		history.replaceState({ ...history.state, [INDEX_KEY]: 0 }, '', location.href);
	}

	// if we reload the page, or Cmd-Shift-T back to it,
	// recover scroll position
	const scroll = scroll_positions[current_history_index];
	if (scroll) scrollTo(scroll.x, scroll.y);

	let hash_navigating = false;

	/** @type {import('types').Page} */
	let page;

	/** @type {{}} */
	let token;

	/** @type {{}} */
	let navigating_token;

	/**
	 * @param {string} href
	 * @param {{ noscroll?: boolean; replaceState?: boolean; keepfocus?: boolean; state?: any }} opts
	 * @param {string[]} redirect_chain
	 */
	async function goto(
		href,
		{ noscroll = false, replaceState = false, keepfocus = false, state = {} },
		redirect_chain
	) {
		const url = new URL(href, get_base_uri(document));

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
		if (!owns(url)) {
			throw new Error('Attempted to prefetch a URL that does not belong to this app');
		}

		const intent = get_navigation_intent(url);

		load_cache.promise = get_navigation_result(intent, false);
		load_cache.id = intent.id;

		return load_cache.promise;
	}

	/**
	 * @param {import('./types').NavigationIntent} intent
	 * @param {string[]} redirect_chain
	 * @param {boolean} no_cache
	 * @param {{hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean, details: { replaceState: boolean, state: any } | null}} [opts]
	 */
	async function update(intent, redirect_chain, no_cache, opts) {
		const current_token = (token = {});
		let navigation_result = await get_navigation_result(intent, no_cache);

		if (!navigation_result && intent.url.pathname === location.pathname) {
			// this could happen in SPA fallback mode if the user navigated to
			// `/non-existent-page`. if we fall back to reloading the page, it
			// will create an infinite loop. so whereas we normally handle
			// unknown routes by going to the server, in this special case
			// we render a client-side error page instead
			navigation_result = await load_root_error_page({
				status: 404,
				error: new Error(`Not found: ${intent.url.pathname}`),
				url: intent.url
			});
		}

		if (!navigation_result) {
			await native_navigation(intent.url);
			return; // unnecessary, but TypeScript prefers it this way
		}

		// abort if user navigated during update
		if (token !== current_token) return;

		invalidated.clear();

		if (navigation_result.redirect) {
			if (redirect_chain.length > 10 || redirect_chain.includes(intent.url.pathname)) {
				navigation_result = await load_root_error_page({
					status: 500,
					error: new Error('Redirect loop'),
					url: intent.url
				});
			} else {
				if (router_enabled) {
					goto(new URL(navigation_result.redirect, intent.url).href, {}, [
						...redirect_chain,
						intent.url.pathname
					]);
				} else {
					await native_navigation(new URL(navigation_result.redirect, location.href));
				}

				return;
			}
		} else if (navigation_result.props?.page?.status >= 400) {
			const updated = await stores.updated.check();
			if (updated) {
				await native_navigation(intent.url);
			}
		}

		updating = true;

		if (opts && opts.details) {
			const { details } = opts;
			const change = details.replaceState ? 0 : 1;
			details.state[INDEX_KEY] = current_history_index += change;
			history[details.replaceState ? 'replaceState' : 'pushState'](details.state, '', intent.url);
		}

		if (started) {
			current = navigation_result.state;

			root.$set(navigation_result.props);
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

				getSelection()?.removeAllRanges();
				root.tabIndex = -1;
				root.focus();

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
				const deep_linked = intent.url.hash && document.getElementById(intent.url.hash.slice(1));
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
		updating = false;

		if (navigation_result.props.page) {
			page = navigation_result.props.page;
		}

		const leaf_node = navigation_result.state.branch[navigation_result.state.branch.length - 1];
		router_enabled = leaf_node?.module.router !== false;
	}

	/** @param {import('./types').NavigationResult} result */
	function initialize(result) {
		current = result.state;

		const style = document.querySelector('style[data-svelte]');
		if (style) style.remove();

		page = result.props.page;

		root = new Root({
			target,
			props: { ...result.props, stores },
			hydrate: true
		});

		started = true;

		if (router_enabled) {
			const navigation = { from: null, to: new URL(location.href) };
			callbacks.after_navigate.forEach((fn) => fn(navigation));
		}
	}

	/**
	 * @param {import('./types').NavigationIntent} intent
	 * @param {boolean} no_cache
	 */
	async function get_navigation_result(intent, no_cache) {
		if (load_cache.id === intent.id && load_cache.promise) {
			return load_cache.promise;
		}

		for (let i = 0; i < intent.routes.length; i += 1) {
			const route = intent.routes[i];

			// load code for subsequent routes immediately, if they are as
			// likely to match the current path/query as the current one
			let j = i + 1;
			while (j < intent.routes.length) {
				const next = intent.routes[j];
				if (next[0].toString() === route[0].toString()) {
					next[1].forEach((loader) => loader());
					j += 1;
				} else {
					break;
				}
			}

			const result = await load_route(route, intent, no_cache);
			if (result) return result;
		}
	}

	/**
	 *
	 * @param {{
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   stuff: Record<string, any>;
	 *   branch: Array<import('./types').BranchNode | undefined>;
	 *   status: number;
	 *   error?: Error;
	 * }} opts
	 */
	async function get_navigation_result_from_branch({ url, params, stuff, branch, status, error }) {
		const filtered = /** @type {import('./types').BranchNode[] } */ (branch.filter(Boolean));
		const redirect = filtered.find((f) => f.loaded?.redirect);

		/** @type {import('./types').NavigationResult} */
		const result = {
			redirect: redirect?.loaded?.redirect,
			state: {
				url,
				params,
				branch,
				session_id
			},
			props: {
				components: filtered.map((node) => node.module.default)
			}
		};

		for (let i = 0; i < filtered.length; i += 1) {
			const loaded = filtered[i].loaded;
			result.props[`props_${i}`] = loaded ? await loaded.props : null;
		}

		if (!current.url || url.href !== current.url.href) {
			result.props.page = { url, params, status, error, stuff };

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

		const leaf = filtered[filtered.length - 1];
		const maxage = leaf.loaded && leaf.loaded.maxage;

		if (maxage) {
			const key = url.pathname + url.search; // omit hash
			let ready = false;

			const clear = () => {
				if (cache.get(key) === result) {
					cache.delete(key);
				}

				unsubscribe();
				clearTimeout(timeout);
			};

			const timeout = setTimeout(clear, maxage * 1000);

			const unsubscribe = stores.session.subscribe(() => {
				if (ready) clear();
			});

			ready = true;

			cache.set(key, result);
		}

		return result;
	}

	/**
	 * @param {{
	 *   status?: number;
	 *   error?: Error;
	 *   module: import('types').CSRComponent;
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   stuff: Record<string, any>;
	 *   props?: Record<string, any>;
	 * }} options
	 */
	async function load_node({ status, error, module, url, params, stuff, props }) {
		/** @type {import('./types').BranchNode} */
		const node = {
			module,
			uses: {
				params: new Set(),
				url: false,
				session: false,
				stuff: false,
				dependencies: new Set()
			},
			loaded: null,
			stuff
		};

		if (props) {
			// shadow endpoint props means we need to mark this URL as a dependency of itself
			node.uses.dependencies.add(url.href);
		}

		/** @type {Record<string, string>} */
		const uses_params = {};
		for (const key in params) {
			Object.defineProperty(uses_params, key, {
				get() {
					node.uses.params.add(key);
					return params[key];
				},
				enumerable: true
			});
		}

		const session = $session;

		if (module.load) {
			/** @type {import('types').LoadInput | import('types').ErrorLoadInput} */
			const load_input = {
				params: uses_params,
				props: props || {},
				get url() {
					node.uses.url = true;
					return url;
				},
				get session() {
					node.uses.session = true;
					return session;
				},
				get stuff() {
					node.uses.stuff = true;
					return { ...stuff };
				},
				fetch(resource, info) {
					const requested = typeof resource === 'string' ? resource : resource.url;
					const { href } = new URL(requested, url);
					node.uses.dependencies.add(href);

					return started ? fetch(resource, info) : initial_fetch(resource, info);
				}
			};

			if (import.meta.env.DEV) {
				// TODO remove this for 1.0
				Object.defineProperty(load_input, 'page', {
					get: () => {
						throw new Error('`page` in `load` functions has been replaced by `url` and `params`');
					}
				});
			}

			if (error) {
				/** @type {import('types').ErrorLoadInput} */ (load_input).status = status;
				/** @type {import('types').ErrorLoadInput} */ (load_input).error = error;
			}

			const loaded = await module.load.call(null, load_input);

			if (!loaded) {
				throw new Error('load function must return a value');
			}

			node.loaded = normalize(loaded);
			if (node.loaded.stuff) node.stuff = node.loaded.stuff;
		} else if (props) {
			node.loaded = normalize({ props });
		}

		return node;
	}

	/**
	 * @param {import('types').CSRRoute} route
	 * @param {import('./types').NavigationIntent} intent
	 * @param {boolean} no_cache
	 */
	async function load_route(route, { id, url, path }, no_cache) {
		if (!no_cache) {
			const cached = cache.get(id);
			if (cached) return cached;
		}

		const [pattern, a, b, get_params, shadow_key] = route;
		const params = get_params
			? // the pattern is for the route which we've already matched to this path
			  get_params(/** @type {RegExpExecArray}  */ (pattern.exec(path)))
			: {};

		const changed = current.url && {
			url: id !== current.url.pathname + current.url.search,
			params: Object.keys(params).filter((key) => current.params[key] !== params[key]),
			session: session_id !== current.session_id
		};

		/** @type {Array<import('./types').BranchNode | undefined>} */
		let branch = [];

		/** @type {Record<string, any>} */
		let stuff = {};
		let stuff_changed = false;

		/** @type {number | undefined} */
		let status = 200;

		/** @type {Error | undefined} */
		let error;

		// preload modules
		a.forEach((loader) => loader());

		load: for (let i = 0; i < a.length; i += 1) {
			/** @type {import('./types').BranchNode | undefined} */
			let node;

			try {
				if (!a[i]) continue;

				const module = await a[i]();
				const previous = current.branch[i];

				const changed_since_last_render =
					!previous ||
					module !== previous.module ||
					(changed.url && previous.uses.url) ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.session && previous.uses.session) ||
					Array.from(previous.uses.dependencies).some((dep) => invalidated.has(dep)) ||
					(stuff_changed && previous.uses.stuff);

				if (changed_since_last_render) {
					/** @type {Record<string, any>} */
					let props = {};

					const is_shadow_page = shadow_key !== undefined && i === a.length - 1;

					if (is_shadow_page) {
						const res = await fetch(
							`${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}__data.json${url.search}`,
							{
								headers: {
									'x-sveltekit-load': /** @type {string} */ (shadow_key)
								}
							}
						);

						if (res.ok) {
							const redirect = res.headers.get('x-sveltekit-location');

							if (redirect) {
								return {
									redirect,
									props: {},
									state: current
								};
							}

							if (res.status === 204) {
								// fallthrough
								return;
							}
							props = await res.json();
						} else {
							status = res.status;
							error = new Error('Failed to load data');
						}
					}

					if (!error) {
						node = await load_node({
							module,
							url,
							params,
							props,
							stuff
						});
					}

					if (node) {
						if (is_shadow_page) {
							node.uses.url = true;
						}

						if (node.loaded) {
							if (node.loaded.fallthrough) {
								return;
							}
							if (node.loaded.error) {
								status = node.loaded.status;
								error = node.loaded.error;
							}

							if (node.loaded.redirect) {
								return {
									redirect: node.loaded.redirect,
									props: {},
									state: current
								};
							}

							if (node.loaded.stuff) {
								stuff_changed = true;
							}
						}
					}
				} else {
					node = previous;
				}
			} catch (e) {
				status = 500;
				error = coalesce_to_error(e);
			}

			if (error) {
				while (i--) {
					if (b[i]) {
						let error_loaded;

						/** @type {import('./types').BranchNode | undefined} */
						let node_loaded;
						let j = i;
						while (!(node_loaded = branch[j])) {
							j -= 1;
						}

						try {
							error_loaded = await load_node({
								status,
								error,
								module: await b[i](),
								url,
								params,
								stuff: node_loaded.stuff
							});

							if (error_loaded?.loaded?.error) {
								continue;
							}

							if (error_loaded?.loaded?.stuff) {
								stuff = {
									...stuff,
									...error_loaded.loaded.stuff
								};
							}

							branch = branch.slice(0, j + 1).concat(error_loaded);
							break load;
						} catch (e) {
							continue;
						}
					}
				}

				return await load_root_error_page({
					status,
					error,
					url
				});
			} else {
				if (node?.loaded?.stuff) {
					stuff = {
						...stuff,
						...node.loaded.stuff
					};
				}

				branch.push(node);
			}
		}

		return await get_navigation_result_from_branch({
			url,
			params,
			stuff,
			branch,
			status,
			error
		});
	}

	/**
	 * @param {{
	 *   status: number;
	 *   error: Error;
	 *   url: URL;
	 * }} opts
	 */
	async function load_root_error_page({ status, error, url }) {
		/** @type {Record<string, string>} */
		const params = {}; // error page does not have params

		const root_layout = await load_node({
			module: await fallback[0],
			url,
			params,
			stuff: {}
		});

		const root_error = await load_node({
			status,
			error,
			module: await fallback[1],
			url,
			params,
			stuff: (root_layout && root_layout.loaded && root_layout.loaded.stuff) || {}
		});

		return await get_navigation_result_from_branch({
			url,
			params,
			stuff: {
				...root_layout?.loaded?.stuff,
				...root_error?.loaded?.stuff
			},
			branch: [root_layout, root_error],
			status,
			error
		});
	}

	/** @param {URL} url */
	function owns(url) {
		return url.origin === location.origin && url.pathname.startsWith(base);
	}

	/** @param {URL} url */
	function get_navigation_intent(url) {
		const path = decodeURI(url.pathname.slice(base.length) || '/');

		/** @type {import('./types').NavigationIntent} */
		const intent = {
			id: url.pathname + url.search,
			routes: routes.filter(([pattern]) => pattern.test(path)),
			url,
			path
		};

		return intent;
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

		if (!owns(url)) {
			await native_navigation(url);
		}

		const pathname = normalize_path(url.pathname, trailing_slash);
		url = new URL(url.origin + pathname + url.search + url.hash);

		const intent = get_navigation_intent(url);

		update_scroll_positions(current_history_index);

		accepted();

		navigating++;

		const current_navigating_token = (navigating_token = {});

		if (started) {
			stores.navigating.set({
				from: current.url,
				to: intent.url
			});
		}

		await update(intent, redirect_chain, false, {
			scroll,
			keepfocus,
			details
		});

		navigating--;

		// navigation was aborted
		if (navigating_token !== current_navigating_token) return;

		if (!navigating) {
			const navigation = { from, to: url };
			callbacks.after_navigate.forEach((fn) => fn(navigation));

			stores.navigating.set(null);
		}
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
			const { href } = new URL(resource, location.href);

			invalidated.add(href);

			if (!invalidating) {
				invalidating = Promise.resolve().then(async () => {
					const intent = get_navigation_intent(new URL(location.href));
					await update(intent, [], true);

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
				? routes.filter((route) => pathnames.some((pathname) => route[0].test(pathname)))
				: routes;

			const promises = matching.map((r) => Promise.all(r[1].map((load) => load())));

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

				// Ignore if url does not have origin (e.g. `mailto:`, `tel:`.)
				// MEMO: Without this condition, firefox will open mailer twice.
				// See: https://github.com/sveltejs/kit/issues/4045
				if (!is_svg_a_element && url.origin === 'null') return;

				// Ignore if tag has
				// 1. 'download' attribute
				// 2. 'rel' attribute includes external
				const rel = (a.getAttribute('rel') || '').split(/\s+/);

				if (a.hasAttribute('download') || rel.includes('external')) {
					return;
				}

				// Ignore if <a> has a target
				if (is_svg_a_element ? a.target.baseVal : a.target) return;

				if (url.href === location.href) {
					if (!location.hash) event.preventDefault();
					return;
				}

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
						replaceState: false
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
		},

		_hydrate: async ({ status, error, nodes, params }) => {
			const url = new URL(location.href);

			/** @type {Array<import('./types').BranchNode | undefined>} */
			const branch = [];

			/** @type {Record<string, any>} */
			let stuff = {};

			/** @type {import('./types').NavigationResult | undefined} */
			let result;

			let error_args;

			try {
				for (let i = 0; i < nodes.length; i += 1) {
					const is_leaf = i === nodes.length - 1;

					let props;

					if (is_leaf) {
						const serialized = document.querySelector('script[sveltekit\\:data-type="props"]');
						if (serialized) {
							props = JSON.parse(/** @type {string} */ (serialized.textContent));
						}
					}

					const node = await load_node({
						module: await nodes[i],
						url,
						params,
						stuff,
						status: is_leaf ? status : undefined,
						error: is_leaf ? error : undefined,
						props
					});

					if (props) {
						node.uses.dependencies.add(url.href);
						node.uses.url = true;
					}

					branch.push(node);

					if (node && node.loaded) {
						if (node.loaded.error) {
							if (error) throw node.loaded.error;
							error_args = {
								status: node.loaded.status,
								error: node.loaded.error,
								url
							};
						} else if (node.loaded.stuff) {
							stuff = {
								...stuff,
								...node.loaded.stuff
							};
						}
					}
				}

				result = error_args
					? await load_root_error_page(error_args)
					: await get_navigation_result_from_branch({
							url,
							params,
							stuff,
							branch,
							status,
							error
					  });
			} catch (e) {
				if (error) throw e;

				result = await load_root_error_page({
					status: 500,
					error: coalesce_to_error(e),
					url
				});
			}

			if (result.redirect) {
				// this is a real edge case — `load` would need to return
				// a redirect but only in the browser
				await native_navigation(new URL(result.redirect, location.href));
			}

			initialize(result);
		}
	};
}
