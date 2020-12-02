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

			await this.render(this.page);

			const dest = select_target(new URL(location.href));

			const token = (current_token = {});
			const { redirect, props, branch } = await hydrate_target(dest);
			if (token !== current_token) return; // a secondary navigation happened while we were loading

			if (redirect) {
				await goto(redirect.location, { replaceState: true });
			} else {
				await render(branch, props, buildPageContext(props, dest.page));
			}
		});
		ready = true;
	}

	// async augment_props(props, page) {
	// 	try {
	// 		const promises = [];

	// 		const match = page.route.pattern.exec(page.page.path);

	// 		page.route.parts.forEach(([loader, get_params], i) => {
	// 			const part_params = props.params = get_params ? get_params(match) : {};

	// 			promises.push(loader().then(async mod => {
	// 				props.components[i] = mod.default;

	// 				if (mod.preload) {
	// 					props[`props_${i}`] = (this.initial && this.initial.preloaded[i + 1]) || (
	// 						await mod.preload.call(
	// 							{
	// 								fetch: (url, opts) => {
	// 									// TODO resolve against target URL?
	// 									return fetch(url, opts);
	// 								},
	// 								redirect: (status, location) => {
	// 									// TODO handle redirects somehow
	// 								},
	// 								error: (status, error) => {
	// 									if (typeof error === 'string') {
	// 										error = new Error(error);
	// 									}

	// 									error.status = status;
	// 									throw error;
	// 								}
	// 							},
	// 							{
	// 								// TODO tidy this up
	// 								...page.page,
	// 								params: part_params
	// 							},
	// 							this.$session
	// 						)
	// 					);
	// 				}
	// 			}));
	// 		});

	// 		await Promise.all(promises);
	// 	} catch (error) {
	// 		props.error = error;
	// 		props.status = error.status || 500;
	// 	}
	// }

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
			this.current_query = hydrated.query; // TODO
		}

		this.root = new this.Root({
			target: this.target,
			props,
			hydrate: true
		});

		// TODO set this.path (path through route DAG) so we can avoid updating unchanged branches
		// TODO set this.query, for the same reason

		this.initial = null;
	}

	async render(page) {
		const token = this.token = {};

		this.stores.preloading.set(true);

		const hydrated = await this.hydrate(page);

		if (this.token === token) { // check render wasn't aborted
			this.root.$set(hydrated.props);

			this.current_branch = hydrated.branch;
			this.current_query = hydrated.query; // TODO

			this.stores.preloading.set(false);
		}
	}

	// TODO is this used?
	async error(error, status) {
		this.root.$set({
			error,
			status
		});

		this.path = [];
	}

	async hydrate({ route, page }) {
		const segments = page.path.split('/').filter(Boolean);

		let redirect = null;

		const props = {
			error: null,
			status: 200,
			components: [],
			page: {
				...page,
				params: null
			}
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
				[[() => this.layout, () => {}], ...route.parts].map(async (part, i) => {
					const segment = segments[i];

					if (part_changed(i, segment, match)) segment_dirty = true;

					if (
						!this.session_dirty &&
						!segment_dirty &&
						this.current_branch[i] &&
						this.current_branch[i].part === part[0]
					) {
						return this.current_branch[i];
					}

					segment_dirty = false;

					const { default: component, preload } = await part[0]();

					let preloaded;
					if (!this.initial || !this.initial.preloaded[i]) {
						preloaded = preload
							? await preload.call(
								preload_context,
								{
									host: page.host,
									path: page.path,
									query: page.query,
									params: part[1] ? part[1](match) : {}
								},
								this.$session
							)
							: {};
					} else {
						preloaded = this.initial.preloaded[i];
					}

					props.components[i] = component;
					props[`props_${i}`] = preloaded;

					return { component, props: preloaded, segment, match, part: part[0] };
				})
			);
		} catch (error) {
			props.error = error;
			props.status = 500;
			branch = [];
		}

		return { redirect, props, branch, query };
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