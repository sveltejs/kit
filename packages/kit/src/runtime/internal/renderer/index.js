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

		function trigger_prefetch(event) {
			const a = find_anchor(event.target);

			if (a && a.rel === 'prefetch') { // TODO make this svelte-prefetch or something
				prefetch(a.href);
			}
		}

		let mousemove_timeout;
		function handle_mousemove(event) {
			clearTimeout(mousemove_timeout);
			mousemove_timeout = setTimeout(() => {
				trigger_prefetch(event);
			}, 20);
		}

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
		const segments = page.path.split('/').filter(Boolean);

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

			let segment_dirty = false;

			const part_changed = (i, segment, match) => {
				// TODO only check query string changes for preload functions
				// that do in fact depend on it (using static analysis or
				// runtime instrumentation). Ditto for session
				if (query !== this.current_query) return true;

				const previous = this.current_branch[i];

				if (!previous) return false;
				if (segment !== previous.segment) return true;
				if (previous.match) {
					// TODO what the hell is this
					if (JSON.stringify(previous.match.slice(1, i + 2)) !== JSON.stringify(match.slice(1, i + 2))) {
						return true;
					}
				}
			};

			branch = await Promise.all(
				[[() => this.layout], ...route.parts].map(async ([loader, get_params], i) => {
					const segment = segments[i];

					if (part_changed(i, segment, match)) segment_dirty = true;

					if (
						!this.session_dirty &&
						!segment_dirty &&
						this.current_branch[i] &&
						this.current_branch[i].loader === loader
					) {
						return this.current_branch[i];
					}

					segment_dirty = false;

					const { default: component, preload } = await loader();

					const params = get_params ? get_params(match) : {};

					let preloaded;
					if (!this.initial || !this.initial.preloaded[i]) {
						preloaded = preload
							? await preload.call(
								preload_context,
								{
									host: page.host,
									path: page.path,
									query: page.query,
									params
								},
								this.$session
							)
							: {};
					} else {
						preloaded = this.initial.preloaded[i];
					}

					props.components[i] = component;
					props[`props_${i}`] = preloaded;

					return { component, params, props: preloaded, segment, match, loader };
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