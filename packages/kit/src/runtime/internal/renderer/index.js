import { writable } from 'svelte/store';
import { find_anchor } from '../utils';

export class Renderer {
	constructor({
		Root,
		target,
		error,
		status,
		preloaded,
		session
	}) {
		this.Root = Root;

		// TODO ideally we wouldn't need to store these...
		this.target = target;

		this.initial = {
			preloaded,
			error,
			status
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

	async augment_props(props, page) {
		try {
			const promises = [];

			const match = page.route.pattern.exec(page.page.path);

			page.route.parts.forEach(([loader, get_params], i) => {
				const part_params = props.params = get_params ? get_params(match) : {};

				promises.push(loader().then(async mod => {
					props.components[i] = mod.default;

					if (mod.preload) {
						props[`props_${i}`] = (this.initial && this.initial.preloaded[i + 1]) || (
							await mod.preload.call(
								{
									fetch: (url, opts) => {
										// TODO resolve against target URL?
										return fetch(url, opts);
									},
									redirect: (status, location) => {
										// TODO handle redirects somehow
									},
									error: (status, error) => {
										if (typeof error === 'string') {
											error = new Error(error);
										}

										error.status = status;
										throw error;
									}
								},
								{
									// TODO tidy this up
									...page.page,
									params: part_params
								},
								this.$session
							)
						);
					}
				}));
			});

			await Promise.all(promises);
		} catch (error) {
			props.error = error;
			props.status = error.status || 500;
		}
	}

	async start(page) {
		const props = {
			stores: this.stores,
			error: this.initial.error,
			status: this.initial.status,
			layout_props: this.initial.preloaded[0], // TODO or call layout preload, if serialisation failed
			components: [],
			page: {
				...page.page, // TODO ugh
				params: null
			}
		};

		if (!this.initial.error) {
			await this.augment_props(props, page);
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

		const props = {
			error: null,
			status: 200,
			components: [],
			page: {
				...page.page, // TODO ugh
				params: null
			}
		};

		await this.augment_props(props, page);

		if (this.token === token) { // check render wasn't aborted
			this.root.$set(props);
			// TODO set this.path (path through route DAG) so we can avoid updating unchanged branches
			// TODO set this.query, for the same reason

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

		const props = { error: null, status: 200, segments: [segments[0]] };

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

		if (!root_preloaded) {
			root_preloaded =
				(layout.preload
					? layout.preload.call(
							preload_context,
							{
								host: page.host,
								path: page.path,
								query: page.query,
								params: {}
							},
							$session
					)
					: {});
		}

		let branch;
		let l = 1;

		try {
			const stringified_query = JSON.stringify(page.query);
			const match = route.pattern.exec(page.path);

			let segment_dirty = false;

			branch = await Promise.all(
				route.parts.map(async (part, i) => {
					const segment = segments[i];

					if (part_changed(i, segment, match, stringified_query)) segment_dirty = true;

					props.segments[l] = segments[i + 1]; // TODO make this less confusing
					if (!part) return { segment };

					const j = l++;

					if (
						!session_dirty &&
						!segment_dirty &&
						current_branch[i] &&
						current_branch[i].part === part.i
					) {
						return current_branch[i];
					}

					segment_dirty = false;

					const { default: component, preload } = await components[part.i]();

					let preloaded;
					if (ready || !initial_preloaded_data[i + 1]) {
						preloaded = preload
							? await preload.call(
								preload_context,
								{
									host: page.host,
									path: page.path,
									query: page.query,
									params: part[1] ? part[1](match) : {}
								},
								$session
							)
							: {};
					} else {
						preloaded = initial_preloaded_data[i + 1];
					}

					return (props[`level${j}`] = { component, props: preloaded, segment, match, part: part.i });
				})
			);
		} catch (error) {
			props.error = error;
			props.status = 500;
			branch = [];
		}

		return { redirect, props, branch };
	}
}