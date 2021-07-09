import { writable } from 'svelte/store';
import { hash } from '../hash.js';
import { normalize } from '../load.js';

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
 * @param {RequestInit} opts
 */
function initial_fetch(resource, opts) {
	const url = typeof resource === 'string' ? resource : resource.url;

	let selector = `script[data-type="svelte-data"][data-url="${url}"]`;

	if (opts && typeof opts.body === 'string') {
		selector += `[data-body="${hash(opts.body)}"]`;
	}

	const script = document.querySelector(selector);
	if (script) {
		const { body, ...init } = JSON.parse(script.textContent);
		return Promise.resolve(new Response(body, init));
	}

	return fetch(resource, opts);
}

/** @typedef {import('types/internal').CSRComponent} CSRComponent */

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

		/** @type {import('./router').Router} */
		this.router = null;

		this.target = target;

		this.started = false;

		this.session_id = 1;
		this.invalid = new Set();
		this.invalidating = null;

		/** @type {import('./types').NavigationState} */
		this.current = {
			page: null,
			session_id: null,
			branch: []
		};

		/** @type {Map<string, import('./types').NavigationResult>} */
		this.cache = new Map();

		this.loading = {
			id: null,
			promise: null
		};

		this.stores = {
			page: page_store({}),
			navigating: writable(null),
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
			this.update(info, [], true);
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
		/** @type {import('./types').BranchNode[]} */
		const branch = [];

		/** @type {Record<string, any>} */
		let context = {};

		/** @type {import('./types').NavigationResult} */
		let result;

		/** @type {number} */
		let new_status;

		/** @type {Error} new_error */
		let new_error;

		try {
			for (let i = 0; i < nodes.length; i += 1) {
				const is_leaf = i === nodes.length - 1;

				const node = await this._load_node({
					module: await nodes[i],
					page,
					context,
					status: is_leaf && status,
					error: is_leaf && error
				});

				branch.push(node);

				if (node && node.loaded) {
					if (node.loaded.error) {
						if (error) throw node.loaded.error;
						new_status = node.loaded.status;
						new_error = node.loaded.error;
					} else if (node.loaded.context) {
						context = {
							...context,
							...node.loaded.context
						};
					}
				}
			}

			result = await this._get_navigation_result_from_branch({ page, branch });
		} catch (e) {
			if (error) throw e;

			new_status = 500;
			new_error = e;
		}

		if (new_error) {
			result = await this._load_error({
				status: new_status,
				error: new_error,
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
				const info = this.router.parse(new URL(location.href));
				await this.update(info, [], true);

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
		if (this.loading.id === info.id) {
			return this.loading.promise;
		}

		console.log(info, no_cache);

		for (let i = 0; i < info.routes.length; i += 1) {
			const route = info.routes[i];

			if (route.length === 1) {
				return { reload: true };
			}

			// load code for subsequent routes immediately, if they are as
			// likely to match the current path/query as the current one
			let j = i + 1;
			while (j < info.routes.length) {
				const next = info.routes[j];
				if (next[0].toString() === route[0].toString()) {
					if (next.length !== 1) next[1].forEach((loader) => loader());
					j += 1;
				} else {
					break;
				}
			}

			const result = await this._load(
				{
					route,
					path: info.path,
					query: info.query
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
	 *   branch: import('./types').BranchNode[]
	 * }} opts
	 */
	async _get_navigation_result_from_branch({ page, branch }) {
		const filtered = branch.filter(Boolean);

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
			if (filtered[i].loaded) result.props[`props_${i}`] = await filtered[i].loaded.props;
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
	 *
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
				lang: page.lang
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
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	async _load({ route, path, query }, no_cache) {
		const key = `${path}?${query}`;

		if (!no_cache && this.cache.has(key)) {
			return this.cache.get(key);
		}

		const [pattern, a, b, get_params, lang] = route;
		const params = get_params ? get_params(pattern.exec(path)) : {};

		const changed = this.current.page && {
			path: path !== this.current.page.path,
			params: Object.keys(params).filter((key) => this.current.page.params[key] !== params[key]),
			query: query.toString() !== this.current.page.query.toString(),
			session: this.session_id !== this.current.session_id
		};

		/** @type {import('types/page').Page} */
		const page = { host: this.host, path, query, params };
		if (lang) page.lang = lang;

		/** @type {import('./types').BranchNode[]} */
		const branch = [];

		/** @type {Record<string, any>} */
		let context = {};
		let context_changed = false;

		/** @type {number} */
		let status = 200;

		/** @type {Error} */
		let error = null;

		// preload modules
		a.forEach((loader) => loader());

		load: for (let i = 0; i < a.length; i += 1) {
			/** @type {import('./types').BranchNode} */
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
								redirect: node.loaded.redirect
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

						/** @type {import('./types').BranchNode} */
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

							if (error_loaded.loaded.error) {
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
	 *   status: number;
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
				context: node && node.loaded && node.loaded.context
			})
		];

		return await this._get_navigation_result_from_branch({ page, branch });
	}
}
