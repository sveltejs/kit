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

export class Renderer {
	/** @param {{
	 *   Root: import('types.internal').CSRComponent;
	 *   layout: import('types.internal').CSRComponent;
	 *   target: Node;
	 *   session: any;
	 *   host: string;
	 * }} opts */
	constructor({ Root, layout, target, session, host }) {
		this.Root = Root;
		this.layout = layout;
		this.host = host;

		/** @type {import('./router').Router} */
		this.router = null;

		this.target = target;

		this.started = false;

		/** @type {import('./types').NavigationState} */
		this.current = {
			page: null,
			query: null,
			session_changed: false,
			nodes: [],
			contexts: []
		};

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
			this.current.session_changed = true;

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
		const navigation_result = await this._get_navigation_result(info);

		// abort if user navigated during update
		if (token !== this.token) return;

		if (navigation_result.reload) {
			location.reload();
		} else if (navigation_result.redirect) {
			if (chain.length > 10 || chain.includes(info.path)) {
				this.root.$set({
					status: 500,
					error: new Error('Redirect loop')
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

		const leaf_node = navigation_result.state.nodes[navigation_result.state.nodes.length - 1];
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
			const [pattern, parts, params] = route;

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

			const nodes = parts.map((loader) => loader());
			const page = {
				host: this.host,
				path: info.path,
				params: params ? params(route[0].exec(info.path)) : {},
				query: info.query
			};

			const result = await this._load({ status: 200, error: null, nodes, page });
			if (result) return result;
		}

		return await this._load({
			status: 404,
			error: new Error(`Not found: ${info.path}`),
			nodes: [],
			page: {
				host: this.host,
				path: info.path,
				query: info.query,
				params: {}
			}
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
				session_changed: false,
				nodes: [],
				contexts: []
			},
			props: {
				status,
				error,

				/** @type {import('types.internal').CSRComponent[]} */
				components: []
			}
		};

		const changed = {
			path: !this.current.page || page.path !== this.current.page.path,
			params: Object.keys(page.params).filter((key) => {
				return !this.current.page || this.current.page.params[key] !== page.params[key];
			}),
			query: query !== this.current.query,
			session: this.current.session_changed,
			context: false
		};

		try {
			const component_promises = [this.layout, ...nodes];
			const props_promises = [];

			/** @type {Record<string, any>} */
			let context;

			for (let i = 0; i < component_promises.length; i += 1) {
				const previous = this.current.nodes[i];
				const previous_context = this.current.contexts[i];

				const module = await component_promises[i];
				result.props.components[i] = module.default;

				if (module.preload) {
					throw new Error(
						'preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#loading'
					);
				}

				const changed_since_last_render =
					!previous ||
					module !== previous.module ||
					(changed.path && previous.uses.path) ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.query && previous.uses.query) ||
					(changed.session && previous.uses.session) ||
					(changed.context && previous.uses.context);

				if (changed_since_last_render) {
					const hash = page.path + query;

					// see if we have some cached data
					const cache = this.caches.get(module);
					const cached = cache && cache.get(hash);

					/** @type {import('./types').PageNode} */
					let node;

					/** @type {import('types.internal').LoadOutput} */
					let loaded;

					if (cached && (!changed.context || !cached.node.uses.context)) {
						({ node, loaded } = cached);
					} else {
						node = {
							module,
							uses: {
								params: new Set(),
								path: false,
								query: false,
								session: false,
								context: false
							}
						};

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
							loaded = await module.load.call(null, {
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
							});

							// if the page component returns nothing from load, fall through
							const is_leaf = i === component_promises.length - 1 && !error;
							if (!loaded && is_leaf) return;
						}
					}

					if (loaded) {
						loaded = normalize(loaded);

						if (loaded.error) {
							if (error) {
								// error while rendering error page, oops
								throw error;
							}

							return await this._load({
								status: loaded.status || 500,
								error: loaded.error,
								nodes: [],
								page: {
									host: page.host,
									path: page.path,
									query: page.query,
									params: {}
								}
							});
						}

						if (loaded.redirect) {
							return {
								redirect: loaded.redirect
							};
						}

						if (loaded.context) {
							changed.context = true;

							context = {
								...context,
								...loaded.context
							};
						}

						if (loaded.maxage) {
							if (!this.caches.has(module)) {
								this.caches.set(module, new Map());
							}

							const cache = this.caches.get(module);
							const cached = { node, loaded };

							cache.set(hash, cached);

							let ready = false;

							const timeout = setTimeout(() => {
								clear();
							}, loaded.maxage * 1000);

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

						props_promises[i] = loaded.props;
					}

					result.state.nodes[i] = node;
					result.state.contexts[i] = context;
				} else {
					result.state.nodes[i] = previous;
					result.state.contexts[i] = context = previous_context;
				}
			}

			// we allow returned `props` to be a Promise so that
			// layout/page loads can happen in parallel
			(await Promise.all(props_promises)).forEach((p, i) => {
				if (p) {
					result.props[`props_${i}`] = p;
				}
			});

			if (!this.current.page || page.path !== this.current.page.path || changed.query) {
				result.props.page = page;
			}

			return result;
		} catch (e) {
			if (error) {
				throw error;
			}

			return await this._load({
				status: 500,
				error: e,
				nodes: [],
				page: {
					host: page.host,
					path: page.path,
					query: page.query,
					params: {}
				}
			});
		}
	}
}
