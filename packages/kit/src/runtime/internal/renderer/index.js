import { writable } from 'svelte/store';
import { find_anchor } from '../utils';

function page_store(value) {
	const store = writable(value);
	let ready = true;

	function notify() {
		ready = true;
		store.update((val) => val);
	}

	function set(new_value) {
		ready = false;
		store.set(new_value);
	}

	function subscribe(run) {
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
	constructor({ Root, layout, target, error, status, preloaded, session }) {
		this.Root = Root;
		this.layout = layout;
		this.layout_loader = () => layout;

		// TODO ideally we wouldn't need to store these...
		this.target = target;

		this.initial = {
			preloaded,
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

		const trigger_prefetch = (event) => {
			const a = find_anchor(event.target);

			if (a && a.hasAttribute('sveltekit:prefetch')) {
				this.prefetch(new URL(a.href));
			}
		};

		let mousemove_timeout;
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

	async start(selected) {
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

		this.root = new this.Root({
			target: this.target,
			props,
			hydrate: true
		});

		this.initial = null;
	}

	notify(selected) {
		this.stores.navigating.set({
			from: this.current.page,
			to: selected.page
		});
	}

	async render(selected) {
		const token = (this.token = {});

		const hydrated = await this.hydrate(selected);

		if (this.token === token) {
			// check render wasn't aborted
			this.current = hydrated.state;

			this.root.$set(hydrated.props);
			this.stores.navigating.set(null);
		}
	}

	async hydrate({ route, page }) {
		const props = {
			error: null,
			status: 200,
			components: []
		};

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

		const state = {
			page,
			query,
			session_changed: false,
			nodes: [],
			contexts: []
		};

		const component_promises = [this.layout_loader(), ...route.parts.map((loader) => loader())];
		const props_promises = [];

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

				const { default: component, load } = await component_promises[i];
				props.components[i] = component;

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

					let node;
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
									...page,
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
						if (loaded.error) {
							const error = new Error(loaded.error.message);
							error.status = loaded.error.status;
							throw error;
						}

						if (loaded.redirect) {
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
			props.status = 500;
			state.nodes = [];
		}

		return { redirect, props, state };
	}

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
