import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../utils.js';

/** @typedef {import('./types.js').Loaded} Loaded */

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: import('types/internal').SSRRenderOptions;
 *   state: import('types/internal').SSRRenderState;
 *   $session: any;
 *   route: import('types/internal').SSRPage;
 * }} opts
 * @returns {Promise<import('types/hooks').ServerResponse>}
 */
export async function respond({ request, options, state, $session, route }) {
	const match = route.pattern.exec(request.path);
	const params = route.params(match);

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params
	};

	let nodes;

	try {
		nodes = await Promise.all(route.a.map((id) => id && options.load_component(id)));
	} catch (/** @type {unknown} */ err) {
		const error = coalesce_to_error(err);

		options.handle_error(error);

		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 500,
			error
		});
	}

	const leaf = nodes[nodes.length - 1].module;

	const page_config = {
		ssr: 'ssr' in leaf ? leaf.ssr : options.ssr,
		router: 'router' in leaf ? leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? leaf.hydrate : options.hydrate
	};

	if (!leaf.prerender && state.prerender && !state.prerender.all) {
		// if the page has `export const prerender = true`, continue,
		// otherwise bail out at this point
		return {
			status: 204,
			headers: {},
			body: null
		};
	}

	/** @type {Array<Loaded> | undefined} */
	let branch;

	/** @type {number} */
	let status = 200;

	/** @type {Error|undefined} */
	let error;

	ssr: if (page_config.ssr) {
		let context = {};
		branch = [];

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {Loaded | undefined} */
			let loaded;

			if (node) {
				try {
					loaded = await load_node({
						request,
						options,
						state,
						route,
						page,
						node,
						$session,
						context,
						is_leaf: i === nodes.length - 1,
						is_error: false
					});

					if (!loaded) return;

					if (loaded.loaded.redirect) {
						return {
							status: loaded.loaded.status,
							headers: {
								location: encodeURI(loaded.loaded.redirect)
							}
						};
					}

					if (loaded.loaded.error) {
						({ status, error } = loaded.loaded);
					}
				} catch (/** @type {unknown} */ err) {
					const e = coalesce_to_error(err);

					options.handle_error(e);

					status = 500;
					error = e;
				}

				if (error) {
					while (i--) {
						if (route.b[i]) {
							const error_node = await options.load_component(route.b[i]);
							let error_loaded;

							/** @type {Loaded} */
							let node_loaded;
							let j = i;
							while (!(node_loaded = branch[j])) {
								j -= 1;
							}

							try {
								error_loaded = await load_node({
									request,
									options,
									state,
									route,
									page,
									node: error_node,
									$session,
									context: node_loaded.context,
									is_leaf: false,
									is_error: true,
									status,
									error
								});

								if (error_loaded.loaded.error) {
									continue;
								}

								branch = branch.slice(0, j + 1).concat(error_loaded);
								break ssr;
							} catch (/** @type {unknown} */ err) {
								const e = coalesce_to_error(err);

								options.handle_error(e);

								continue;
							}
						}
					}

					// TODO backtrack until we find an __error.svelte component
					// that we can use as the leaf node
					// for now just return regular error page
					return await respond_with_error({
						request,
						options,
						state,
						$session,
						status,
						error
					});
				}
			}

			branch.push(loaded);

			if (loaded && loaded.loaded.context) {
				// TODO come up with better names for stuff
				context = {
					...context,
					...loaded.loaded.context
				};
			}
		}
	}

	try {
		return await render_response({
			options,
			$session,
			page_config,
			status,
			error,
			branch: branch && branch.filter(Boolean),
			page
		});
	} catch (/** @type {unknown} */ err) {
		const error = coalesce_to_error(err);

		options.handle_error(error);

		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 500,
			error
		});
	}
}
