import { writable } from 'svelte/store';
import { find_anchor } from '../utils';

export class Renderer {
	constructor({
		Root,
		layout,
		target,
		error,
		status,
		preloaded,
		session
	}) {
		this.Root = Root;
		this.layout = layout;

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
			page: writable({}),
			preloading: writable(false),
			session: writable(session)
		};

		this.$session = null;
		this.session_dirty = false;

		this.root = null;

		const trigger_prefetch = (event) => {
			const a = find_anchor(event.target);

			if (a && a.rel === 'prefetch') { // TODO make this svelte-prefetch or something
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

			const page = this.router.select(new URL(location.href));
			this.render(page);
		});
		ready = true;
	}

	async start(page) {
		const props = {
			stores: this.stores,
			error: this.initial.error,
			status: this.initial.status
		};

		if (!this.initial.error) {
			const hydrated = await this.hydrate(page);

			if (hydrated.redirect) {
				throw new Error('TODO client-side redirects');
			}

			Object.assign(props, hydrated.props);
			this.current_branch = hydrated.branch;
			this.current_query = hydrated.query;
			this.current_path = hydrated.path;
		}

		this.root = new this.Root({
			target: this.target,
			props,
			hydrate: true
		});

		this.initial = null;
	}

	async render(page) {
		const token = this.token = {};

		this.stores.preloading.set(true);

		const hydrated = await this.hydrate(page);

		if (this.token === token) { // check render wasn't aborted
			this.current_branch = hydrated.branch;
			this.current_query = hydrated.query;
			this.current_path = hydrated.path;

			this.root.$set(hydrated.props);

			this.stores.preloading.set(false);
		}
	}

	async hydrate({ route, page }) {
		const segments = page.path.split('/');

		let redirect = null;

		const props = {
			error: null,
			status: 200,
			components: []
		};

		const preload_context = {
			fetch: (url, opts) => fetch(url, opts),
			redirect: (statusCode, location) => {
				if (redirect && (redirect.statusCode !== statusCode || redirect.location !== location)) {
					throw new Error('Conflicting redirects');
				}
				redirect = { statusCode, location };
			},
			error: (status, error) => {
				props.error = typeof error === 'string' ? new Error(error) : error;
				props.status = status;
			}
		};

		const query = page.query.toString();

		let branch;

		try {
			const match = route.pattern.exec(page.path);

			branch = await Promise.all(
				[[() => this.layout], ...route.parts].map(async ([loader, get_params], i) => {
					const params = get_params ? get_params(match) : {};
					const stringified_params = JSON.stringify(params);

					const previous = this.current_branch[i];
					if (previous) {
						const changed = (
							(previous.loader !== loader) ||
							(previous.uses_session && this.session_dirty) ||
							(previous.uses_query && query_dirty) ||
							(previous.stringified_params !== stringified_params)
						);

						if (!changed) {
							return previous;
						}
					}

					const { default: component, preload } = await loader();

					const uses_session = preload && preload.length > 1;
					let uses_query = false;

					const preloaded = this.initial?.preloaded[i] || (
						preload
							? await preload.call(
								preload_context,
								{
									get query() {
										uses_query = true;
										return page.query;
									},
									host: page.host,
									path: page.path,
									params
								},
								this.$session
							)
							: {}
					);

					props.components[i] = component;
					props[`props_${i}`] = preloaded;

					return {
						component,
						params,
						stringified_params,
						props: preloaded,
						match,
						loader,
						uses_session,
						uses_query
					};
				})
			);

			if (page.path !== this.current_path) {
				props.page = {
					...page,
					params: branch[branch.length - 1].params
				};
			}
		} catch (error) {
			props.error = error;
			props.status = 500;
			branch = [];
		}

		return { redirect, props, branch, query, path: page.path };
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
