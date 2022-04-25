import { render_response } from './render.js';
import { load_node } from './load_node.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types').SSRNode} SSRNode
 * @typedef {import('types').SSROptions} SSROptions
 * @typedef {import('types').SSRState} SSRState
 */

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: SSROptions;
 *   state: SSRState;
 *   $session: any;
 *   resolve_opts: import('types').RequiredResolveOptions;
 *   route: import('types').SSRPage;
 * }} opts
 * @returns {Promise<Response>}
 */
export async function respond(opts) {
	const { event, options, state, $session, route, resolve_opts } = opts;

	/** @type {Array<SSRNode | undefined>} */
	let nodes;

	if (!resolve_opts.ssr) {
		return await render_response({
			...opts,
			branch: [],
			page_config: {
				hydrate: true,
				router: true
			},
			status: 200,
			error: null,
			event,
			stuff: {}
		});
	}

	try {
		nodes = await Promise.all(
			// we use == here rather than === because [undefined] serializes as "[null]"
			route.a.map((n) => (n == undefined ? n : options.manifest._.nodes[n]()))
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

		return await respond_with_error({
			event,
			options,
			state,
			$session,
			status: 500,
			error,
			resolve_opts
		});
	}

	// the leaf node will be present. only layouts may be undefined
	const leaf = /** @type {SSRNode} */ (nodes[nodes.length - 1]).module;

	let page_config = get_page_config(leaf, options);

	if (state.prerender) {
		// if the page isn't marked as prerenderable (or is explicitly
		// marked NOT prerenderable, if `prerender.default` is `true`),
		// then bail out at this point
		const should_prerender = leaf.prerender ?? state.prerender.default;
		if (!should_prerender) {
			return new Response(undefined, {
				status: 204
			});
		}
	}

	/** @type {Array<Loaded>} */
	let branch = [];

	/** @type {number} */
	let status = 200;

	/** @type {Error | null} */
	let error = null;

	/** @type {string[]} */
	let set_cookie_headers = [];

	let stuff = {};

	ssr: {
		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			/** @type {Loaded | undefined} */
			let loaded;

			if (node) {
				try {
					loaded = await load_node({
						...opts,
						node,
						stuff,
						is_error: false,
						is_leaf: i === nodes.length - 1
					});

					set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);

					if (loaded.loaded.redirect) {
						return with_cookies(
							new Response(undefined, {
								status: loaded.loaded.status,
								headers: {
									location: loaded.loaded.redirect
								}
							}),
							set_cookie_headers
						);
					}

					if (loaded.loaded.error) {
						({ status, error } = loaded.loaded);
					}
				} catch (err) {
					const e = coalesce_to_error(err);

					options.handle_error(e, event);

					status = 500;
					error = e;
				}

				if (loaded && !error) {
					branch.push(loaded);
				}

				if (error) {
					while (i--) {
						if (route.b[i]) {
							const index = /** @type {number} */ (route.b[i]);
							const error_node = await options.manifest._.nodes[index]();

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
										node: error_node,
										stuff: node_loaded.stuff,
										is_error: true,
										is_leaf: false,
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

								options.handle_error(e, event);

								continue;
							}
						}
					}

					// TODO backtrack until we find an __error.svelte component
					// that we can use as the leaf node
					// for now just return regular error page
					return with_cookies(
						await respond_with_error({
							event,
							options,
							state,
							$session,
							status,
							error,
							resolve_opts
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
				event,
				page_config,
				status,
				error,
				branch: branch.filter(Boolean)
			}),
			set_cookie_headers
		);
	} catch (err) {
		const error = coalesce_to_error(err);

		options.handle_error(error, event);

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
 * @param {import('types').SSRComponent} leaf
 * @param {SSROptions} options
 */
function get_page_config(leaf, options) {
	// TODO remove for 1.0
	if ('ssr' in leaf) {
		throw new Error(
			'`export const ssr` has been removed — use the handle hook instead: https://kit.svelte.dev/docs/hooks#handle'
		);
	}

	return {
		router: 'router' in leaf ? !!leaf.router : options.router,
		hydrate: 'hydrate' in leaf ? !!leaf.hydrate : options.hydrate
	};
}

/**
 * @param {Response} response
 * @param {string[]} set_cookie_headers
 */
function with_cookies(response, set_cookie_headers) {
	if (set_cookie_headers.length) {
		set_cookie_headers.forEach((value) => {
			response.headers.append('set-cookie', value);
		});
	}
	return response;
}
