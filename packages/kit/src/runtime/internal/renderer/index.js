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

		this.current_branch = [];

		this.prefetching = {
			href: null,
			promise: null
		};

		this.stores = {
			page: page_store({}),
			navigating: writable(false),
			session: writable(session)
		};

		this.$session = null;
		this.session_dirty = false;

		this.root = null;

		const trigger_prefetch = (event) => {
			const a = find_anchor(event.target);

			if (a && a.rel === 'prefetch') {
				// TODO make this svelte-prefetch or something
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
			this.session_dirty = true;

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

	async render(selected) {
		const token = (this.token = {});

		this.stores.navigating.set(true);

		const hydrated = await this.hydrate(selected);

		if (this.token === token) {
			// check render wasn't aborted
			this.current = hydrated.state;

			this.root.$set(hydrated.props);
			this.stores.navigating.set(false);
		}
	}

	async hydrate({ route, page }) {
		const props = {
			error: null,
			status: 200,
			components: []
		};

		const load_context = {
			page, // TODO `...page` or `page`? https://github.com/sveltejs/kit/issues/268#issuecomment-744050319
			session: this.$session,
			fetch: (url, opts) => fetch(url, opts)
		};

		const state = {
			path: page.path,
			params: JSON.stringify(page.params),
			query: page.query.toString(),
			nodes: []
		};

		const component_promises = [this.layout_loader(), ...route.parts.map((loader) => loader())];
		const props_promises = [];

		let context = {};
		let redirect;

		try {
			for (let i = 0; i < component_promises.length; i += 1) {
				// TODO skip if unchanged
				// state.nodes[i] = this.current.nodes[i];

				const mod = await component_promises[i];
				props.components[i] = mod.default;

				const loaded =
					mod.load &&
					(await mod.load.call(null, {
						...load_context,
						context: { ...context }
					}));

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
						context = {
							...context,
							...loaded.context
						};
					}

					if (loaded.maxage) {
						// TODO cache for subsequent navigation back
						// to this node
					}

					props_promises[i] = loaded.props;
				}
			}

			const new_props = await Promise.all(props_promises);

			new_props.forEach((p, i) => {
				if (p) {
					props[`props_${i}`] = p;
				}
			});

			if (!this.current || state.path !== this.current.path) {
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
