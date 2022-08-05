import { negotiate } from '../../../utils/http.js';
import { render_response } from './render.js';
import { load_data } from './load_data.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { method_not_allowed } from '../utils.js';
import { Redirect } from '../../../index/private.js';
import { create_fetch } from './fetch.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types').SSRNode} SSRNode
 * @typedef {import('types').SSROptions} SSROptions
 * @typedef {import('types').SSRState} SSRState
 */

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRPage} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @param {import('types').RequiredResolveOptions} resolve_opts
 * @returns {Promise<Response>}
 */
export async function render_page(event, route, options, state, resolve_opts) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return new Response(`Not found: ${event.url.pathname}`, {
			status: 404
		});
	}

	const accept = negotiate(event.request.headers.get('accept') || 'text/html', [
		'text/html',
		'application/json'
	]);

	if (accept === 'application/json') {
		const node = await options.manifest._.nodes[route.page]();
		if (node.server) {
			return handle_json_request(event, node.server);
		}
	}

	const $session = await options.hooks.getSession(event);

	const { fetcher, fetched } = create_fetch({ event, options, state, route });

	// TODO for non-GET requests, first call handler in +page.server.js
	// (this also determines status code)

	if (!resolve_opts.ssr) {
		return await render_response({
			branch: [],
			fetched,
			page_config: {
				hydrate: true,
				router: true
			},
			status: 200,
			error: null,
			event,
			options,
			state,
			$session,
			resolve_opts
		});
	}

	try {
		const nodes = await Promise.all([
			// we use == here rather than === because [undefined] serializes as "[null]"
			...route.layouts.map((n) => (n == undefined ? n : options.manifest._.nodes[n]())),
			options.manifest._.nodes[route.page]()
		]);

		const leaf_node = /** @type {import('types').SSRNode} */ (nodes.at(-1));

		let page_config = get_page_config(leaf_node, options);

		if (state.prerendering) {
			// if the page isn't marked as prerenderable (or is explicitly
			// marked NOT prerenderable, if `prerender.default` is `true`),
			// then bail out at this point
			const should_prerender = leaf_node.module.prerender ?? options.prerender.default;
			if (!should_prerender) {
				return new Response(undefined, {
					status: 204
				});
			}

			const mod = leaf_node.server;
			if (mod && (mod.POST || mod.PUT || mod.DELETE || mod.PATCH)) {
				throw new Error('Cannot prerender pages that have endpoints with mutative methods');
			}
		}

		/** @type {Array<Loaded | null>} */
		let branch = [];

		/** @type {number} */
		let status = 200;

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			if (node) {
				try {
					const loaded = await load_data({
						event,
						options,
						state,
						$session,
						node,
						fetcher
					});

					branch.push(loaded);
				} catch (err) {
					const error = coalesce_to_error(err);

					options.handle_error(error, event);

					status = 500;

					while (i--) {
						if (route.errors[i]) {
							const index = /** @type {number} */ (route.errors[i]);
							const error_node = await options.manifest._.nodes[index]();

							let j = i;
							while (!branch[j]) j -= 1;

							const error_loaded = /** @type {import('./types').Loaded} */ ({
								node: error_node,
								data: {},
								server_data: {}
							});

							return await render_response({
								event,
								options,
								state,
								$session,
								resolve_opts,
								page_config: { router: true, hydrate: true },
								status,
								error,
								branch: branch
									.slice(0, j + 1)
									.filter(Boolean)
									.concat(error_loaded),
								fetched
							});
						}
					}
				}
			} else {
				// push an empty slot so we can rewind past gaps to the
				// layout that corresponds with an +error.svelte page
				branch.push(null);
			}
		}

		return await render_response({
			event,
			options,
			state,
			$session,
			resolve_opts,
			page_config,
			status,
			error: null,
			branch: branch.filter(Boolean),
			fetched
		});
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
}

/**
 * @param {import('types').SSRNode} leaf
 * @param {SSROptions} options
 */
function get_page_config(leaf, options) {
	// TODO we can reinstate this now that it's in the module
	if (leaf.module && 'ssr' in leaf.module) {
		throw new Error(
			'`export const ssr` has been removed — use the handle hook instead: https://kit.svelte.dev/docs/hooks#handle'
		);
	}

	return {
		router: leaf.module?.router ?? options.router,
		hydrate: leaf.module?.hydrate ?? options.hydrate
	};
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode['server']} mod
 */
async function handle_json_request(event, mod) {
	const method = /** @type {import('types').HttpMethod} */ (event.request.method);
	const handler = mod[method === 'HEAD' ? 'GET' : method];

	if (!handler) {
		return method_not_allowed(mod, method);
	}

	try {
		const result = await handler.call(null, event);

		if (method === 'HEAD') {
			return new Response();
		}

		if (method === 'GET') {
			return json_response(result, 200);
		}

		if (method === 'POST') {
			if (result.errors) {
				return json_response({ errors: result.errors }, result.status || 400);
			}

			return new Response(undefined, {
				status: 201,
				headers: result.location ? { location: result.location } : undefined
			});
		}

		return new Response(undefined, { status: 204 });
	} catch (error) {
		if (error instanceof Redirect) {
			return Response.redirect(error.location, error.status);
		}

		return json_response({ message: error.message }, error.status || 500);
	}
}

/**
 * @param {any} data
 * @param {number} status
 */
function json_response(data, status) {
	// TODO replace with Response.json one day
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8'
		}
	});
}
