import { writable } from 'svelte/store';
import { hash } from '../hash.js';
import { normalize } from '../load.js';
import { coalesce_to_error } from '../utils.js';

/**
 * @typedef {import('types/internal').CSRComponent} CSRComponent
 *
 * @typedef {Partial<import('types/page').Page>} Page
 * @typedef {{ from: Page; to: Page }} Navigating
 */

/** @param {any} value */
function page_store(value) {
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

/**
 * @param {RequestInfo} resource
 * @param {RequestInit} [opts]
 */
function initial_fetch(resource, opts) {
	const url = typeof resource === 'string' ? resource : resource.url;

	let selector = `script[data-type="svelte-data"][data-url="${url}"]`;

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
	/** @param {{
	 *   Root: CSRComponent;
	 *   fallback: [CSRComponent, CSRComponent];
	 *   target: Node;
	 *   session: any;
	 *   host: string;
	 * }} opts */
	constructor({ Root, fallback, target, session, host }) {
		this.Root = Root;
		this.fallback = fallback;
		this.host = host;

		/** @type {import('./router').Router | undefined} */
		this.router;

		this.target = target;

		this.started = false;

		this.session_id = 1;
		this.invalid = new Set();
		this.invalidating = null;

		/** @type {import('./types').NavigationState} */
		this.current = {
			// @ts-ignore - we need the initial value to be null
			page: null,
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
			page: page_store({}),
			navigating: writable(/** @type {Navigating | null} */ (null)),
			session: writable(session)
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

	/**
	 * @param {{
	 *   status: number;
	 *   error: Error;
	 *   nodes: Array<Promise<CSRComponent>>;
	 *   page: import('types/page').Page;
	 * }} selected
	 */
	async start({ status, error, nodes, page }) {
		/** @type {Array<import('./types').BranchNode | undefined>} */
		const branch = [];

		/** @type {Record<string, any>} */
		let context = {};

		/** @type {import('./types').NavigationResult | undefined} */
		let result;

		let error_args;

		try {
			for (let i = 0; i < nodes.length; i += 1) {
				const is_leaf = i === nodes.length - 1;

				const node = await this._load_node({
					module: await nodes[i],
					page,
					context,
					status: is_leaf ? status : undefined,
					error: is_leaf ? error : undefined
				});

				branch.push(node);

				if (node && node.loaded) {
					if (node.loaded.error) {
						if (error) throw node.loaded.error;
						error_args = {
							status: node.loaded.status,
							error: node.loaded.error,
							path: page.path,
							query: page.query
						};
					} else if (node.loaded.context) {
						context = {
							...context,
							...node.loaded.context
						};
					}
				}
			}

			result = error_args
				? await this._load_error(error_args)
				: await this._get_navigation_result_from_branch({ page, branch });
		} catch (/** @type {unknown} */ e) {
			if (error) throw e;

			result = await this._load_error({
				status: 500,
				error: coalesce_to_error(e),
				path: page.path,
				query: page.query
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

	/** @param {{ path: string, query: URLSearchParams }} destination */
	notify({ path, query }) {
		dispatchEvent(new CustomEvent('sveltekit:navigation-start'));

		if (this.started) {
			this.stores.navigating.set({
				from: {
					path: this.current.page.path,
					query: this.current.page.query
				},
				to: {
					path,
					query
				}
			});
		}
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @param {string[]} chain
	 * @param {boolean} no_cache
	 */
	async update(info, chain, no_cache) {
		const token = (this.token = {});
		let navigation_result = await this._get_navigation_result(info, no_cache);

		// abort if user navigated during update
		if (token !== this.token) return;

		this.invalid.clear();

		if (navigation_result.redirect) {
			if (chain.length > 10 || chain.includes(info.path)) {
				navigation_result = await this._load_error({
					status: 500,
					error: new Error('Redirect loop'),
					path: info.path,
					query: info.query
				});
			} else {
				if (this.router) {
					this.router.goto(navigation_result.redirect, { replaceState: true }, [
						...chain,
						info.path
					]);
				} else {
					location.href = new URL(navigation_result.redirect, location.href).href;
				}

				return;
			}
		}

		if (navigation_result.reload) {
			location.reload();
		} else if (this.started) {
			this.current = navigation_result.state;

			this.root.$set(navigation_result.props);
			this.stores.navigating.set(null);

			await 0;
		} else {
			this._init(navigation_result);
		}

		dispatchEvent(new CustomEvent('sveltekit:navigation-end'));
		this.loading.promise = null;
		this.loading.id = null;

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

			// check if endpoint route
			if (route.length === 1) {
				return { reload: true, props: {}, state: this.current };
			}

			// load code for subsequent routes immediately, if they are as
			// likely to match the current path/query as the current one
			let j = i + 1;
			while (j < info.routes.length) {
				const next = info.routes[j];
				if (next[0].toString() === route[0].toString()) {
					// if it's a page route
					if (next.length !== 1) {
						next[1].forEach((loader) => loader());
					}
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
			error: new Error(`Not found: ${info.path}`),
			path: info.path,
			query: info.query
		});
	}

	/**
	 *
	 * @param {{
	 *   page: import('types/page').Page;
	 *   branch: Array<import('./types').BranchNode | undefined>
	 * }} opts
	 */
	async _get_navigation_result_from_branch({ page, branch }) {
		const filtered = /** @type {import('./types').BranchNode[] } */ (branch.filter(Boolean));

		/** @type {import('./types').NavigationResult} */
		const result = {
			state: {
				page,
				branch,
				session_id: this.session_id
			},
			props: {
				components: filtered.map((node) => node.module.default)
			}
		};

		for (let i = 0; i < filtered.length; i += 1) {
			const loaded = filtered[i].loaded;
			if (loaded) result.props[`props_${i}`] = await loaded.props;
		}

		if (
			!this.current.page ||
			page.path !== this.current.page.path ||
			page.query.toString() !== this.current.page.query.toString()
		) {
			result.props.page = page;
		}

		const leaf = filtered[filtered.length - 1];
		const maxage = leaf.loaded && leaf.loaded.maxage;

		if (maxage) {
			const key = `${page.path}?${page.query}`;
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
	 *   page: import('types/page').Page;
	 *   context: Record<string, any>;
	 * }} options
	 * @returns
	 */
	async _load_node({ status, error, module, page, context }) {
		/** @type {import('./types').BranchNode} */
		const node = {
			module,
			uses: {
				params: new Set(),
				path: false,
				query: false,
				session: false,
				context: false,
				dependencies: []
			},
			loaded: null,
			context
		};

		/** @type {Record<string, string>} */
		const params = {};
		for (const key in page.params) {
			Object.defineProperty(params, key, {
				get() {
					node.uses.params.add(key);
					return page.params[key];
				},
				enumerable: true
			});
		}

		const session = this.$session;

		if (module.load) {
			const { started } = this;

			/** @type {import('types/page').LoadInput | import('types/page').ErrorLoadInput} */
			const load_input = {
				page: {
					host: page.host,
					params,
					get path() {
						node.uses.path = true;
						return page.path;
					},
					get query() {
						node.uses.query = true;
						return page.query;
					}
				},
				get session() {
					node.uses.session = true;
					return session;
				},
				get context() {
					node.uses.context = true;
					return { ...context };
				},
				fetch(resource, info) {
					const url = typeof resource === 'string' ? resource : resource.url;
					const { href } = new URL(url, new URL(page.path, document.baseURI));
					node.uses.dependencies.push(href);

					return started ? fetch(resource, info) : initial_fetch(resource, info);
				},
				uses(resource) {
					node.uses.dependencies.push(resource);
				}
			};

			if (error) {
				/** @type {import('types/page').ErrorLoadInput} */ (load_input).status = status;
				/** @type {import('types/page').ErrorLoadInput} */ (load_input).error = error;
			}

			const loaded = await module.load.call(null, load_input);

			// if the page component returns nothing from load, fall through
			if (!loaded) return;

			node.loaded = normalize(loaded);
			if (node.loaded.context) node.context = node.loaded.context;
		}

		return node;
	}

	/**
	 * @param {import('./types').NavigationCandidate} selected
	 * @param {boolean} no_cache
	 * @returns {Promise<import('./types').NavigationResult | undefined>} undefined if fallthrough
	 */
	async _load({ route, info: { path, decoded_path, query } }, no_cache) {
		const key = `${decoded_path}?${query}`;

		if (!no_cache) {
			const cached = this.cache.get(key);
			if (cached) return cached;
		}

		const [pattern, a, b, get_params] = route;
		const params = get_params
			? // the pattern is for the route which we've already matched to this path
			  get_params(/** @type {RegExpExecArray}  */ (pattern.exec(decoded_path)))
			: {};

		const changed = this.current.page && {
			path: path !== this.current.page.path,
			params: Object.keys(params).filter((key) => this.current.page.params[key] !== params[key]),
			query: query.toString() !== this.current.page.query.toString(),
			session: this.session_id !== this.current.session_id
		};

		/** @type {import('types/page').Page} */
		const page = { host: this.host, path, query, params };

		/** @type {Array<import('./types').BranchNode | undefined>} */
		const branch = [];

		/** @type {Record<string, any>} */
		let context = {};
		let context_changed = false;

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
					(changed.path && previous.uses.path) ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.query && previous.uses.query) ||
					(changed.session && previous.uses.session) ||
					previous.uses.dependencies.some((dep) => this.invalid.has(dep)) ||
					(context_changed && previous.uses.context);

				if (changed_since_last_render) {
					node = await this._load_node({
						module,
						page,
						context
					});

					const is_leaf = i === a.length - 1;

					if (node && node.loaded) {
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

						if (node.loaded.context) {
							context_changed = true;
						}
					} else if (is_leaf && module.load) {
						// if the leaf node has a `load` function
						// that returns nothing, fall through
						return;
					}
				} else {
					node = previous;
				}
			} catch (e) {
				status = 500;
				error = e;
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
								page,
								context: node_loaded.context
							});

							if (error_loaded && error_loaded.loaded && error_loaded.loaded.error) {
								continue;
							}

							branch.push(error_loaded);
							break load;
						} catch (e) {
							continue;
						}
					}
				}

				return await this._load_error({
					status,
					error,
					path,
					query
				});
			} else {
				if (node && node.loaded && node.loaded.context) {
					context = {
						...context,
						...node.loaded.context
					};
				}

				branch.push(node);
			}
		}

		return await this._get_navigation_result_from_branch({ page, branch });
	}

	/**
	 * @param {{
	 *   status?: number;
	 *   error: Error;
	 *   path: string;
	 *   query: URLSearchParams
	 * }} opts
	 */
	async _load_error({ status, error, path, query }) {
		const page = {
			host: this.host,
			path,
			query,
			params: {}
		};

		const node = await this._load_node({
			module: await this.fallback[0],
			page,
			context: {}
		});

		const branch = [
			node,
			await this._load_node({
				status,
				error,
				module: await this.fallback[1],
				page,
				context: (node && node.loaded && node.loaded.context) || {}
			})
		];

		return await this._get_navigation_result_from_branch({ page, branch });
	}
}
