import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types/hooks').ServerResponse} ServerResponse
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
 *   params: Record<string, string>;
 *   ssr: boolean;
 * }} opts
 * @returns {Promise<ServerResponse | undefined>}
 */
export async function respond(opts) {
	const { request, options, state, $session, route, ssr } = opts;

	/** @type {Array<SSRNode | undefined>} */
	let nodes;

	if (!ssr) {
		return await render_response({
			...opts,
			branch: [],
			page_config: {
				hydrate: true,
				router: true
			},
			status: 200,
			url: request.url,
			stuff: {}
		});
	}

	try {
		nodes = await Promise.all(
			route.a.map((n) => options.manifest._.nodes[n] && options.manifest._.nodes[n]())
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 500,
			error,
			ssr
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
			headers: {}
		};
	}

	/** @type {Array<Loaded>} */
	let branch = [];

	/** @type {number} */
	let status = 200;

	/** @type {Error|undefined} */
	let error;

	/** @type {string[]} */
	let set_cookie_headers = [];

	let stuff = {};

	ssr: if (ssr) {
		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {Loaded | undefined} */
			let loaded;

			if (node) {
				try {
					loaded = await load_node({
						...opts,
						url: request.url,
						node,
						stuff,
						is_error: false
					});

					if (!loaded) return;

					set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);

					if (loaded.loaded.redirect) {
						return with_cookies(
							{
								status: loaded.loaded.status,
								headers: {
									location: encodeURI(loaded.loaded.redirect)
								}
							},
							set_cookie_headers
						);
					}

					if (loaded.loaded.error) {
						({ status, error } = loaded.loaded);
					}
				} catch (err) {
					const e = coalesce_to_error(err);

					options.handle_error(e, request);

					status = 500;
					error = e;
				}

				if (loaded && !error) {
					branch.push(loaded);
				}

				if (error) {
					while (i--) {
						if (route.b[i]) {
							const error_node = await options.manifest._.nodes[route.b[i]]();

							/** @type {Loaded} */
							let node_loaded;
							let j = i;
							while (!(node_loaded = branch[j])) {
								j -= 1;
							}

							try {
								const error_loaded = /** @type {import('./types').Loaded} */ (
									await load_node({
										...opts,
										url: request.url,
										node: error_node,
										stuff: node_loaded.stuff,
										is_error: true,
										status,
										error
									})
								);

								if (error_loaded.loaded.error) {
									continue;
								}

								page_config = get_page_config(error_node.module, options);
								branch = branch.slice(0, j + 1).concat(error_loaded);
								stuff = { ...node_loaded.stuff, ...error_loaded.stuff };
								break ssr;
							} catch (err) {
								const e = coalesce_to_error(err);

								options.handle_error(e, request);

								continue;
							}
						}
					}

					// TODO backtrack until we find an __error.svelte component
					// that we can use as the leaf node
					// for now just return regular error page
					return with_cookies(
						await respond_with_error({
							request,
							options,
							state,
							$session,
							status,
							error,
							ssr
						}),
						set_cookie_headers
					);
				}
			}

			if (loaded && loaded.loaded.stuff) {
				stuff = {
					...stuff,
					...loaded.loaded.stuff
				};
			}
		}
	}

	try {
		return with_cookies(
			await render_response({
				...opts,
				stuff,
				url: request.url,
				page_config,
				status,
				error,
				branch: branch.filter(Boolean)
			}),
			set_cookie_headers
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, request);

		return with_cookies(
			await respond_with_error({
				...opts,
				status: 500,
				error
			}),
			set_cookie_headers
		);
	}
}

/**
 * @param {import('types/internal').SSRComponent} leaf
 * @param {SSRRenderOptions} options
 */
function get_page_config(leaf, options) {
	// TODO remove for 1.0
	if ('ssr' in leaf) {
		throw new Error(
			'`export const ssr` has been removed — use the handle hook instead: https://kit.svelte.dev/docs#hooks-handle'
		);
	}

	return {
		router: 'router' in leaf ? !!leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? !!leaf.hydrate : options.hydrate
	};
}

/**
 * @param {ServerResponse} response
 * @param {string[]} set_cookie_headers
 */
function with_cookies(response, set_cookie_headers) {
	if (set_cookie_headers.length) {
		response.headers['set-cookie'] = set_cookie_headers;
	}
	return response;
}
