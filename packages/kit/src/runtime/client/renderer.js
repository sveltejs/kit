import { writable } from 'svelte/store';
import { normalize } from '../load';
import { find_anchor } from './utils';

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

export class Renderer {
	/** @param {{
	 *   Root: import('../../types').CSRComponent;
	 *   layout: import('../../types').CSRComponent;
	 *   target: Node;
	 *   error: Error;
	 *   status: number;
	 *   session: any;
	 * }} opts */
	constructor({ Root, layout, target, error, status, session }) {
		this.Root = Root;
		this.layout = layout;
		this.layout_loader = () => layout;

		/** @type {import('./router').Router} */
		this.router = null;

		// TODO ideally we wouldn't need to store these...
		this.target = target;

		this.initial = {
			error,
			status
		};

		this.current = {
			page: null,
			query: null,
			session_changed: false,
			nodes: [],
			contexts: []
		};

		this.caches = new Map();

		this.prefetching = {
			href: null,
			promise: null
		};

		this.stores = {
			page: page_store({}),
			navigating: writable(null),
			session: writable(session)
		};

		this.$session = null;

		this.root = null;

		/** @param {MouseEvent} event */
		const trigger_prefetch = (event) => {
			const a = find_anchor(/** @type {Node} */ (event.target));
			if (a && a.hasAttribute('sveltekit:prefetch')) {
				this.prefetch(new URL(/** @type {string} */ (a.href)));
			}
		};

		/** @type {NodeJS.Timeout} */
		let mousemove_timeout;

		/** @param {MouseEvent} event */
		const handle_mousemove = (event) => {
			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				trigger_prefetch(event);
			}, 20);
		};

		addEventListener('touchstart', trigger_prefetch);
		addEventListener('mousemove', handle_mousemove);

		let ready = false;
		this.stores.session.subscribe(async (value) => {
			this.$session = value;

			if (!ready) return;
			this.current.session_changed = true;

			const selected = this.router.select(new URL(location.href));
			this.render(selected);
		});
		ready = true;
	}

	/** @param {import('./types').NavigationTarget} selected */
	async start(selected) {
		/** @type {Record<string, any>} */
		const props = {
			stores: this.stores,
			error: this.initial.error,
			status: this.initial.status,
			page: selected.page
		};

		if (this.initial.error) {
			props.components = [this.layout.default];
		} else {
			const hydrated = await this.hydrate(selected);

			if (hydrated.redirect) {
				throw new Error('TODO client-side redirects');
			}

			Object.assign(props, hydrated.props);
			this.current = hydrated.state;
		}

		// remove dev-mode SSR <style> insert, since it doesn't apply
		// to hydrated markup (HMR requires hashes to be rewritten)
		// TODO only in dev
		// TODO it seems this doesn't always work with the classname
		// stabilisation in vite-plugin-svelte? see e.g.
		// hn.svelte.dev
		// const style = document.querySelector('style[data-svelte]');
		// if (style) style.remove();

		this.root = new this.Root({
			target: this.target,
			props,
			hydrate: true
		});

		this.initial = null;
	}

	/** @param {import('./types').NavigationTarget} selected */
	notify(selected) {
		this.stores.navigating.set({
			from: this.current.page,
			to: selected.page
		});
	}

	/**
	 * @param {import('./types').NavigationTarget} selected
	 * @param {string[]} chain
	 */
	async render(selected, chain) {
		const token = (this.token = {});

		const hydrated = await this.hydrate(selected);

		if (this.token === token) {
			if (hydrated.redirect) {
				if (chain.length > 10 || chain.includes(this.current.page.path)) {
					hydrated.props.status = 500;
					hydrated.props.error = new Error('Redirect loop');
				} else {
					this.router.goto(hydrated.redirect, { replaceState: true }, [
						...chain,
						this.current.page.path
					]);

					return;
				}
			}

			// check render wasn't aborted
			this.current = hydrated.state;

			this.root.$set(hydrated.props);
			this.stores.navigating.set(null);
		}
	}

	/** @param {import('./types').NavigationTarget} selected */
	async hydrate({ route, page }) {
		/** @type {Record<string, any>} */
		const props = {
			status: 200,

			/** @type {Error} */
			error: null,

			/** @type {import('../../types').CSRComponent[]} */
			components: []
		};

		/**
		 * @param {string} url
		 * @param {RequestInit} opts
		 */
		const fetcher = (url, opts) => {
			if (this.initial) {
				const script = document.querySelector(`script[type="svelte-data"][url="${url}"]`);
				if (script) {
					const { body, ...init } = JSON.parse(script.textContent);
					return Promise.resolve(new Response(body, init));
				}
			}

			return fetch(url, opts);
		};

		const query = page.query.toString();

		// TODO come up with a better name
		/** @typedef {{
		 *   component: import('../../types').CSRComponent;
		 *   uses: {
		 *     params: Set<string>;
		 *     query: boolean;
		 *     session: boolean;
		 *     context: boolean;
		 *   }
		 * }} Branch */

		const state = {
			page,
			query,
			session_changed: false,
			/** @type {Branch[]} */
			nodes: [],
			/** @type {Record<string, any>[]} */
			contexts: []
		};

		const component_promises = [this.layout_loader(), ...route.parts.map((loader) => loader())];
		const props_promises = [];

		/** @type {Record<string, any>} */
		let context;
		let redirect;

		const changed = {
			params: Object.keys(page.params).filter((key) => {
				return !this.current.page || this.current.page.params[key] !== page.params[key];
			}),
			query: query !== this.current.query,
			session: this.current.session_changed,
			context: false
		};

		try {
			for (let i = 0; i < component_promises.length; i += 1) {
				const previous = this.current.nodes[i];
				const previous_context = this.current.contexts[i];

				const { default: component, preload, load } = await component_promises[i];
				props.components[i] = component;

				if (preload) {
					throw new Error(
						'preload has been deprecated in favour of load. Please consult the documentation: https://kit.svelte.dev/docs#load'
					);
				}

				const changed_since_last_render =
					!previous ||
					component !== previous.component ||
					changed.params.some((param) => previous.uses.params.has(param)) ||
					(changed.query && previous.uses.query) ||
					(changed.session && previous.uses.session) ||
					(changed.context && previous.uses.context);

				if (changed_since_last_render) {
					const hash = page.path + query;

					// see if we have some cached data
					const cache = this.caches.get(component);
					const cached = cache && cache.get(hash);

					/** @type {Branch} */
					let node;

					/** @type {import('../../types').LoadResult} */
					let loaded;

					if (cached && (!changed.context || !cached.node.uses.context)) {
						({ node, loaded } = cached);
					} else {
						node = {
							component,
							uses: {
								params: new Set(),
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

						loaded =
							load &&
							(await load.call(null, {
								page: {
									host: page.host,
									path: page.path,
									params,
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
								fetch: fetcher
							}));
					}

					if (loaded) {
						loaded = normalize(loaded);

						if (loaded.error) {
							// TODO sticking the status on the error object is kinda hacky
							loaded.error.status = loaded.status;
							throw loaded.error;
						}

						if (loaded.redirect) {
							// TODO return from here?
							redirect = loaded.redirect;
							break;
						}

						if (loaded.context) {
							changed.context = true;

							context = {
								...context,
								...loaded.context
							};
						}

						if (loaded.maxage) {
							if (!this.caches.has(component)) {
								this.caches.set(component, new Map());
							}

							const cache = this.caches.get(component);
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

					state.nodes[i] = node;
					state.contexts[i] = context;
				} else {
					state.nodes[i] = previous;
					state.contexts[i] = context = previous_context;
				}
			}

			const new_props = await Promise.all(props_promises);

			new_props.forEach((p, i) => {
				if (p) {
					props[`props_${i}`] = p;
				}
			});

			if (!this.current.page || page.path !== this.current.page.path) {
				props.page = page;
			}
		} catch (error) {
			props.error = error;
			props.status = error.status || 500;
			state.nodes = [];
		}

		return { redirect, props, state };
	}

	/** @param {URL} url */
	async prefetch(url) {
		const page = this.router.select(url);

		if (page) {
			if (url.href !== this.prefetching.href) {
				this.prefetching = { href: url.href, promise: this.hydrate(page) };
			}

			return this.prefetching.promise;
		} else {
			throw new Error(`Could not prefetch ${url.href}`);
		}
	}
}
