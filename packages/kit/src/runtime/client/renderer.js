import { tick } from 'svelte';
import { writable } from 'svelte/store';
import { coalesce_to_error } from '../../utils/error.js';
import { hash } from '../hash.js';
import { normalize } from '../load.js';
import { base } from '../paths.js';

/**
 * @typedef {import('types/internal').CSRComponent} CSRComponent
 * @typedef {{ from: URL; to: URL }} Navigating
 */

/** @param {any} value */
function notifiable_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update((val) => val);
	}

	/** @param {any} new_value */
	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	/** @param {(value: any) => void} run */
	function subscribe(run) {
		/** @type {any} */
		let old_value;
		return store.subscribe((new_value) => {
			if (old_value === undefined || (ready && new_value !== old_value)) {
				run((old_value = new_value));
			}
		});
	}

	return { notify, set, subscribe };
}

function create_updated_store() {
	const { set, subscribe } = writable(false);

	const interval = +(
		/** @type {string} */ (import.meta.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL)
	);
	const initial = import.meta.env.VITE_SVELTEKIT_APP_VERSION;

	/** @type {NodeJS.Timeout} */
	let timeout;

	async function check() {
		if (import.meta.env.DEV || import.meta.env.SSR) return false;

		clearTimeout(timeout);

		if (interval) timeout = setTimeout(check, interval);

		const file = import.meta.env.VITE_SVELTEKIT_APP_VERSION_FILE;

		const res = await fetch(`${base}/${file}`, {
			headers: {
				pragma: 'no-cache',
				'cache-control': 'no-cache'
			}
		});

		if (res.ok) {
			const { version } = await res.json();
			const updated = version !== initial;

			if (updated) {
				set(true);
				clearTimeout(timeout);
			}

			return updated;
		} else {
			throw new Error(`Version check failed: ${res.status}`);
		}
	}

	if (interval) timeout = setTimeout(check, interval);

	return {
		subscribe,
		check
	};
}

/**
 * @param {RequestInfo} resource
 * @param {RequestInit} [opts]
 */
function initial_fetch(resource, opts) {
	const url = typeof resource === 'string' ? resource : resource.url;

	let selector = `script[data-type="svelte-data"][data-url=${JSON.stringify(url)}]`;

	if (opts && typeof opts.body === 'string') {
		selector += `[data-body="${hash(opts.body)}"]`;
	}

	const script = document.querySelector(selector);
	if (script && script.textContent) {
		const { body, ...init } = JSON.parse(script.textContent);
		return Promise.resolve(new Response(body, init));
	}

	return fetch(resource, opts);
}

export class Renderer {
	/**
	 * @param {{
	 *   Root: CSRComponent;
	 *   fallback: [CSRComponent, CSRComponent];
	 *   target: Node;
	 *   session: any;
	 * }} opts
	 */
	constructor({ Root, fallback, target, session }) {
		this.Root = Root;
		this.fallback = fallback;

		/** @type {import('./router').Router | undefined} */
		this.router;

		this.target = target;

		this.started = false;

		this.session_id = 1;
		this.invalid = new Set();
		this.invalidating = null;
		this.autoscroll = true;
		this.updating = false;

		/** @type {import('./types').NavigationState} */
		this.current = {
			// @ts-ignore - we need the initial value to be null
			url: null,
			session_id: 0,
			branch: []
		};

		/** @type {Map<string, import('./types').NavigationResult>} */
		this.cache = new Map();

		/** @type {{id: string | null, promise: Promise<import('./types').NavigationResult> | null}} */
		this.loading = {
			id: null,
			promise: null
		};

		this.stores = {
			url: notifiable_store({}),
			page: notifiable_store({}),
			navigating: writable(/** @type {Navigating | null} */ (null)),
			session: writable(session),
			updated: create_updated_store()
		};

		this.$session = null;

		this.root = null;

		let ready = false;
		this.stores.session.subscribe(async (value) => {
			this.$session = value;

			if (!ready || !this.router) return;
			this.session_id += 1;

			const info = this.router.parse(new URL(location.href));
			if (info) this.update(info, [], true);
		});
		ready = true;
	}

	disable_scroll_handling() {
		if (import.meta.env.DEV && this.started && !this.updating) {
			throw new Error('Can only disable scroll handling during navigation');
		}

		if (this.updating || !this.started) {
			this.autoscroll = false;
		}
	}

	/**
	 * @param {{
	 *   status: number;
	 *   error: Error;
	 *   nodes: Array<Promise<CSRComponent>>;
	 *   params: Record<string, string>;
	 * }} selected
	 */
	async start({ status, error, nodes, params }) {
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
					const serialized = document.querySelector('[data-type="svelte-props"]');
					if (serialized) {
						props = JSON.parse(/** @type {string} */ (serialized.textContent));
					}
				}

				const node = await this._load_node({
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
				? await this._load_error(error_args)
				: await this._get_navigation_result_from_branch({
						url,
						params,
						stuff,
						branch,
						status,
						error
				  });
		} catch (e) {
			if (error) throw e;

			result = await this._load_error({
				status: 500,
				error: coalesce_to_error(e),
				url
			});
		}

		if (result.redirect) {
			// this is a real edge case — `load` would need to return
			// a redirect but only in the browser
			location.href = new URL(result.redirect, location.href).href;
			return;
		}

		this._init(result);
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @param {string[]} chain
	 * @param {boolean} no_cache
	 * @param {{hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean}} [opts]
	 */
	async handle_navigation(info, chain, no_cache, opts) {
		if (this.started) {
			this.stores.navigating.set({
				from: this.current.url,
				to: info.url
			});
		}

		await this.update(info, chain, no_cache, opts);
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @param {string[]} chain
	 * @param {boolean} no_cache
	 * @param {{hash?: string, scroll: { x: number, y: number } | null, keepfocus: boolean}} [opts]
	 */
	async update(info, chain, no_cache, opts) {
		const token = (this.token = {});
		let navigation_result = await this._get_navigation_result(info, no_cache);

		// abort if user navigated during update
		if (token !== this.token) return;

		this.invalid.clear();

		if (navigation_result.redirect) {
			if (chain.length > 10 || chain.includes(info.url.pathname)) {
				navigation_result = await this._load_error({
					status: 500,
					error: new Error('Redirect loop'),
					url: info.url
				});
			} else {
				if (this.router) {
					this.router.goto(
						new URL(navigation_result.redirect, info.url).href,
						{ replaceState: true },
						[...chain, info.url.pathname]
					);
				} else {
					location.href = new URL(navigation_result.redirect, location.href).href;
				}

				return;
			}
		} else if (navigation_result.props?.page?.status >= 400) {
			const updated = await this.stores.updated.check();
			if (updated) {
				location.href = info.url.href;
				return;
			}
		}

		this.updating = true;

		if (this.started) {
			this.current = navigation_result.state;

			this.root.$set(navigation_result.props);
			this.stores.navigating.set(null);
		} else {
			this._init(navigation_result);
		}

		// opts must be passed if we're navigating
		if (opts) {
			const { scroll, keepfocus } = opts;

			if (!keepfocus) {
				getSelection()?.removeAllRanges();
				document.body.focus();
			}

			// need to render the DOM before we can scroll to the rendered elements
			await tick();

			if (this.autoscroll) {
				const deep_linked = info.url.hash && document.getElementById(info.url.hash.slice(1));
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

		this.loading.promise = null;
		this.loading.id = null;
		this.autoscroll = true;
		this.updating = false;

		if (!this.router) return;

		const leaf_node = navigation_result.state.branch[navigation_result.state.branch.length - 1];
		if (leaf_node && leaf_node.module.router === false) {
			this.router.disable();
		} else {
			this.router.enable();
		}
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	load(info) {
		this.loading.promise = this._get_navigation_result(info, false);
		this.loading.id = info.id;

		return this.loading.promise;
	}

	/** @param {string} href */
	invalidate(href) {
		this.invalid.add(href);

		if (!this.invalidating) {
			this.invalidating = Promise.resolve().then(async () => {
				const info = this.router && this.router.parse(new URL(location.href));
				if (info) await this.update(info, [], true);

				this.invalidating = null;
			});
		}

		return this.invalidating;
	}

	/** @param {import('./types').NavigationResult} result */
	_init(result) {
		this.current = result.state;

		const style = document.querySelector('style[data-svelte]');
		if (style) style.remove();

		this.root = new this.Root({
			target: this.target,
			props: {
				stores: this.stores,
				...result.props
			},
			hydrate: true
		});

		this.started = true;

		if (this.router) {
			const navigation = { from: null, to: new URL(location.href) };
			this.router.callbacks.after_navigate.forEach((fn) => fn(navigation));
		}
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @param {boolean} no_cache
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	async _get_navigation_result(info, no_cache) {
		if (this.loading.id === info.id && this.loading.promise) {
			return this.loading.promise;
		}

		for (let i = 0; i < info.routes.length; i += 1) {
			const route = info.routes[i];

			// load code for subsequent routes immediately, if they are as
			// likely to match the current path/query as the current one
			let j = i + 1;
			while (j < info.routes.length) {
				const next = info.routes[j];
				if (next[0].toString() === route[0].toString()) {
					next[1].forEach((loader) => loader());
					j += 1;
				} else {
					break;
				}
			}

			const result = await this._load(
				{
					route,
					info
				},
				no_cache
			);
			if (result) return result;
		}

		return await this._load_error({
			status: 404,
			error: new Error(`Not found: ${info.url.pathname}`),
			url: info.url
		});
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
	async _get_navigation_result_from_branch({ url, params, stuff, branch, status, error }) {
		const filtered = /** @type {import('./types').BranchNode[] } */ (branch.filter(Boolean));
		const redirect = filtered.find((f) => f.loaded && f.loaded.redirect);

		/** @type {import('./types').NavigationResult} */
		const result = {
			redirect: redirect && redirect.loaded ? redirect.loaded.redirect : undefined,
			state: {
				url,
				params,
				branch,
				session_id: this.session_id
			},
			props: {
				components: filtered.map((node) => node.module.default)
			}
		};

		for (let i = 0; i < filtered.length; i += 1) {
			const loaded = filtered[i].loaded;
			result.props[`props_${i}`] = loaded ? await loaded.props : null;
		}

		if (!this.current.url || url.href !== this.current.url.href) {
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
				if (this.cache.get(key) === result) {
					this.cache.delete(key);
				}

				unsubscribe();
				clearTimeout(timeout);
			};

			const timeout = setTimeout(clear, maxage * 1000);

			const unsubscribe = this.stores.session.subscribe(() => {
				if (ready) clear();
			});

			ready = true;

			this.cache.set(key, result);
		}

		return result;
	}

	/**
	 * @param {{
	 *   status?: number;
	 *   error?: Error;
	 *   module: CSRComponent;
	 *   url: URL;
	 *   params: Record<string, string>;
	 *   stuff: Record<string, any>;
	 *   props?: Record<string, any>;
	 * }} options
	 * @returns
	 */
	async _load_node({ status, error, module, url, params, stuff, props }) {
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

		const session = this.$session;

		if (module.load) {
			const { started } = this;

			/** @type {import('types/page').LoadInput | import('types/page').ErrorLoadInput} */
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
				/** @type {import('types/page').ErrorLoadInput} */ (load_input).status = status;
				/** @type {import('types/page').ErrorLoadInput} */ (load_input).error = error;
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
	 * @param {import('./types').NavigationCandidate} selected
	 * @param {boolean} no_cache
	 * @returns {Promise<import('./types').NavigationResult | undefined>} undefined if fallthrough
	 */
	async _load({ route, info: { url, path } }, no_cache) {
		const key = url.pathname + url.search;

		if (!no_cache) {
			const cached = this.cache.get(key);
			if (cached) return cached;
		}

		const [pattern, a, b, get_params, has_shadow] = route;
		const params = get_params
			? // the pattern is for the route which we've already matched to this path
			  get_params(/** @type {RegExpExecArray}  */ (pattern.exec(path)))
			: {};

		const changed = this.current.url && {
			url: key !== this.current.url.pathname + this.current.url.search,
			params: Object.keys(params).filter((key) => this.current.params[key] !== params[key]),
			session: this.session_id !== this.current.session_id
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
				const previous = this.current.branch[i];

				const changed_since_last_render =
					!previous ||
					module !== previous.module ||
					(changed.url && previous.uses.url) ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.session && previous.uses.session) ||
					Array.from(previous.uses.dependencies).some((dep) => this.invalid.has(dep)) ||
					(stuff_changed && previous.uses.stuff);

				if (changed_since_last_render) {
					/** @type {Record<string, any>} */
					let props = {};

					if (has_shadow && i === a.length - 1) {
						const res = await fetch(
							`${url.pathname}${url.pathname.endsWith('/') ? '' : '/'}__data.json${url.search}`,
							{
								headers: {
									'x-sveltekit-load': 'true'
								}
							}
						);

						if (res.ok) {
							const redirect = res.headers.get('x-sveltekit-location');

							if (redirect) {
								return {
									redirect,
									props: {},
									state: this.current
								};
							}

							props = await res.json();
						} else {
							status = res.status;
							error = new Error('Failed to load data');
						}
					}

					if (!error) {
						node = await this._load_node({
							module,
							url,
							params,
							props,
							stuff
						});
					}

					if (node && node.loaded) {
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
								state: this.current
							};
						}

						if (node.loaded.stuff) {
							stuff_changed = true;
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
							error_loaded = await this._load_node({
								status,
								error,
								module: await b[i](),
								url,
								params,
								stuff: node_loaded.stuff
							});

							if (error_loaded && error_loaded.loaded && error_loaded.loaded.error) {
								continue;
							}

							if (error_loaded && error_loaded.loaded && error_loaded.loaded.stuff) {
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

				return await this._load_error({
					status,
					error,
					url
				});
			} else {
				if (node && node.loaded && node.loaded.stuff) {
					stuff = {
						...stuff,
						...node.loaded.stuff
					};
				}

				branch.push(node);
			}
		}

		return await this._get_navigation_result_from_branch({
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
	async _load_error({ status, error, url }) {
		/** @type {Record<string, string>} */
		const params = {}; // error page does not have params

		const node = await this._load_node({
			module: await this.fallback[0],
			url,
			params,
			stuff: {}
		});
		const error_node = await this._load_node({
			status,
			error,
			module: await this.fallback[1],
			url,
			params,
			stuff: (node && node.loaded && node.loaded.stuff) || {}
		});

		const branch = [node, error_node];
		const stuff = { ...node?.loaded?.stuff, ...error_node?.loaded?.stuff };

		return await this._get_navigation_result_from_branch({
			url,
			params,
			stuff,
			branch,
			status,
			error
		});
	}
}
