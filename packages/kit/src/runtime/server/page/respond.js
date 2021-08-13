import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { is_prerender_enabled, respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../utils.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/internal').SSRNode} SSRNode
 * @typedef {import('types/internal').SSRRenderOptions} SSRRenderOptions
 * @typedef {import('types/internal').SSRRenderState} SSRRenderState
 */

/**
 * @param {{
 *   request: import('types/hooks').ServerRequest;
 *   options: SSRRenderOptions;
 *   state: SSRRenderState;
 *   $session: any;
 *   route: import('types/internal').SSRPage;
 *   page: import('types/page').Page;
 * }} opts
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
export async function respond(opts) {
	const { request, options, state, $session, route } = opts;

	/** @type {Array<SSRNode | undefined>} */
	let nodes;

	try {
		nodes = await Promise.all(route.a.map((id) => (id ? options.load_component(id) : undefined)));
	} catch (/** @type {unknown} */ err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 500,
			error
		});
	}

	// the leaf node will be present. only layouts may be undefined
	const leaf = /** @type {SSRNode} */ (nodes[nodes.length - 1]).module;

	let page_config = get_page_config(leaf, options);

	if (!leaf.prerender && state.prerender && !state.prerender.all) {
		// if the page has `export const prerender = true`, continue,
		// otherwise bail out at this point
		return {
			status: 204,
			headers: {},
			body: ''
		};
	}

	/** @type {Array<Loaded>} */
	let branch = [];

	/** @type {number} */
	let status = 200;

	/** @type {Error|undefined} */
	let error;

	ssr: if (page_config.ssr) {
		let context = {};

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {Loaded | undefined} */
			let loaded;

			if (node) {
				try {
					loaded = await load_node({
						...opts,
						node,
						context,
						prerender_enabled: is_prerender_enabled(options, node, state),
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

					options.hooks.handleError({ error: e, request });

					status = 500;
					error = e;
				}

				if (loaded && !error) {
					branch.push(loaded);
				}

				if (error) {
					while (i--) {
						if (route.b[i]) {
							const error_node = await options.load_component(route.b[i]);

							/** @type {Loaded} */
							let node_loaded;
							let j = i;
							while (!(node_loaded = branch[j])) {
								j -= 1;
							}

							try {
								// there's no fallthough on an error page, so we know it's not undefined
								const error_loaded = /** @type {import('./types').Loaded} */ (await load_node({
									...opts,
									node: error_node,
									context: node_loaded.context,
									prerender_enabled: is_prerender_enabled(options, error_node, state),
									is_leaf: false,
									is_error: true,
									status,
									error
								}));

								if (error_loaded.loaded.error) {
									continue;
								}

								page_config = get_page_config(error_node.module, options);
								branch = branch.slice(0, j + 1).concat(error_loaded);
								break ssr;
							} catch (/** @type {unknown} */ err) {
								const e = coalesce_to_error(err);

								options.hooks.handleError({ error: e, request });

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
			...opts,
			page_config,
			status,
			error,
			branch: branch.filter(Boolean)
		});
	} catch (/** @type {unknown} */ err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return await respond_with_error({
			...opts,
			status: 500,
			error
		});
	}
}

/**
 * @param {import('types/internal').SSRComponent} leaf
 * @param {SSRRenderOptions} options
 */
function get_page_config(leaf, options) {
	return {
		ssr: 'ssr' in leaf ? !!leaf.ssr : options.ssr,
		router: 'router' in leaf ? !!leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? !!leaf.hydrate : options.hydrate
	};
}
