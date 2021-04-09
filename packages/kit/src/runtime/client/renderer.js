import { writable } from 'svelte/store';
import { normalize } from '../load';

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
	const script = document.querySelector(`script[type="svelte-data"][url="${url}"]`);
	if (script) {
		const { body, ...init } = JSON.parse(script.textContent);
		return Promise.resolve(new Response(body, init));
	}

	return fetch(resource, opts);
}

/** @typedef {import('types.internal').CSRComponent} CSRComponent */

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

		/** @type {import('./types').NavigationState} */
		this.current = {
			page: null,
			query: null,
			session_id: null,
			branch: []
		};

		/** @type {Map<CSRComponent, Map<string, import('./types').BranchNode>>} */
		this.caches = new Map();

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

			if (!ready) return;
			this.session_id += 1;

			const info = this.router.parse(new URL(location.href));
			this.update(info, []);
		});
		ready = true;
	}

	/**
	 * @param {import('./types').NavigationCandidate} selected
	 */
	async start(selected) {
		const result = await this._load(selected);

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
	 */
	async update(info, chain) {
		const token = (this.token = {});
		let navigation_result = await this._get_navigation_result(info);

		// abort if user navigated during update
		if (token !== this.token) return;

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
		if (leaf_node.module.router === false) {
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
		this.loading.promise = this._get_navigation_result(info);
		this.loading.id = info.id;

		return this.loading.promise;
	}

	/**
	 * @param {import('./types').NavigationInfo} info
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	async _get_navigation_result(info) {
		if (this.loading.id === info.id) {
			return this.loading.promise;
		}

		for (let i = 0; i < info.routes.length; i += 1) {
			const route = info.routes[i];
			const [pattern, a, b, params] = route;

			if (route.length === 1) {
				return { reload: true };
			}

			// load code for subsequent routes immediately, if they are as
			// likely to match the current path/query as the current one
			let j = i + 1;
			while (j < info.routes.length) {
				const next = info.routes[j];
				if (next[0].toString() === pattern.toString()) {
					if (next.length !== 1) next[1].forEach((loader) => loader());
					j += 1;
				} else {
					break;
				}
			}

			const nodes = a.map((loader) => loader());
			const page = {
				host: this.host,
				path: info.path,
				params: params ? params(route[0].exec(info.path)) : {},
				query: info.query
			};

			const result = await this._load({ status: 200, error: null, nodes, page });
			if (result) return result;
		}

		return await this._load_error({
			status: 404,
			error: new Error(`Not found: ${info.path}`),
			path: info.path,
			query: info.query
		});
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
	 * @param {import('./types').NavigationCandidate} selected
	 * @returns {Promise<import('./types').NavigationResult>}
	 */
	async _load({ status, error, nodes, page }) {
		const query = page.query.toString();

		/** @type {import('./types').NavigationResult} */
		const result = {
			state: {
				page,
				query,
				session_id: this.session_id,
				branch: []
			},
			props: {
				/** @type {CSRComponent[]} */
				components: []
			}
		};

		const changed = {
			path: !this.current.page || page.path !== this.current.page.path,
			params: Object.keys(page.params).filter((key) => {
				return !this.current.page || this.current.page.params[key] !== page.params[key];
			}),
			query: query !== this.current.query,
			session: this.session_id !== this.current.session_id,
			context: false
		};

		try {
			/** @type {Record<string, any>} */
			let context = {};

			for (let i = 0; i < nodes.length; i += 1) {
				const previous = this.current.branch[i];

				const module = await nodes[i];
				if (!module) continue;

				const changed_since_last_render =
					!previous ||
					module !== previous.module ||
					(changed.path && previous.uses.path) ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.query && previous.uses.query) ||
					(changed.session && previous.uses.session) ||
					(changed.context && previous.uses.context);

				/** @type {import('./types').BranchNode} */
				let node;

				if (changed_since_last_render) {
					const hash = page.path + query;

					const is_leaf = i === nodes.length - 1 && !error;

					// see if we have some cached data
					const cache = this.caches.get(module);
					const cached = cache && cache.get(hash);

					if (cached && (!changed.context || !cached.uses.context)) {
						node = cached;
					} else {
						node = {
							module,
							uses: {
								params: new Set(),
								path: false,
								query: false,
								session: false,
								context: false
							},
							loaded: null,
							context: null
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
							/** @type {import('types.internal').LoadInput | import('types.internal').ErrorLoadInput} */
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
								fetch: this.started ? fetch : initial_fetch
							};

							if (error) {
								/** @type {import('types.internal').ErrorLoadInput} */ (load_input).status = status;
								/** @type {import('types.internal').ErrorLoadInput} */ (load_input).error = error;
							}

							const loaded = await module.load.call(null, load_input);

							// if the page component returns nothing from load, fall through
							if (!loaded && is_leaf) return;

							node.loaded = normalize(loaded);
						}
					}

					if (node.loaded) {
						if (node.loaded.error) {
							if (error) {
								// error while rendering error page, oops
								throw error;
							}

							return await this._load_error({
								status: node.loaded.status || 500,
								error: node.loaded.error,
								path: page.path,
								query: page.query
							});
						}

						if (node.loaded.redirect) {
							return {
								redirect: node.loaded.redirect
							};
						}

						if (node.loaded.context) {
							changed.context = true;
						}

						if (is_leaf && node.loaded.maxage) {
							if (!this.caches.has(module)) {
								this.caches.set(module, new Map());
							}

							const cache = this.caches.get(module);
							const cached = node;

							cache.set(hash, cached);

							let ready = false;

							const timeout = setTimeout(() => {
								clear();
							}, node.loaded.maxage * 1000);

							const clear = () => {
								if (cache.get(hash) === cached) {
									cache.delete(hash);
								}

								unsubscribe();
								clearTimeout(timeout);
							};

							const unsubscribe = this.stores.session.subscribe(() => {
								if (ready) clear();
							});

							ready = true;
						}
					}
				} else {
					node = previous;
				}

				result.state.branch.push(node);

				if (node && node.loaded && node.loaded.context) {
					context = {
						...context,
						...node.loaded.context
					};
				}
			}

			const branch = result.state.branch.filter(Boolean);

			for (let i = 0; i < branch.length; i += 1) {
				result.props.components[i] = branch[i].module.default;
				if (branch[i].loaded) result.props[`props_${i}`] = await branch[i].loaded.props;
			}

			if (!this.current.page || page.path !== this.current.page.path || changed.query) {
				result.props.page = page;
			}

			return result;
		} catch (e) {
			if (error) {
				throw error;
			}

			return await this._load_error({
				status: 500,
				error: e,
				path: page.path,
				query: page.query
			});
		}
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
		return await this._load({
			status,
			error,
			nodes: this.fallback,
			page: {
				host: this.host,
				path,
				query,
				params: {}
			}
		});
	}
}
