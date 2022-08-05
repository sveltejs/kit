import { negotiate } from '../../../utils/http.js';
import { render_response } from './render.js';
import { respond_with_error } from './respond_with_error.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { method_not_allowed, clone_error } from '../utils.js';
import { create_fetch } from './fetch.js';
import { LoadURL, PrerenderingURL } from '../../../utils/url.js';
import { Redirect } from '../../../index/private.js';

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
			return handle_json_request(event, options, node.server);
		}
	}

	const $session = await options.hooks.getSession(event);

	const { fetcher, fetched } = create_fetch({ event, options, state, route });

	try {
		const nodes = await Promise.all([
			// we use == here rather than === because [undefined] serializes as "[null]"
			...route.layouts.map((n) => (n == undefined ? n : options.manifest._.nodes[n]())),
			options.manifest._.nodes[route.page]()
		]);

		// TODO for non-GET requests, first call handler in +page.server.js
		// (this also determines status code)
		const leaf_node = /** @type {import('types').SSRNode} */ (nodes.at(-1));

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

		/** @type {Error | null} */
		let error = null;

		/** @type {Array<Promise<import('types').JSONObject | null>>} */
		const server_promises = nodes.map((node, i) => {
			if (error) throw error; // if an error happens immediately, don't bother with the rest of the nodes
			return Promise.resolve().then(async () => {
				try {
					const server_data = node?.server?.GET?.call(null, {
						...event,
						parent: async () => {
							const data = {};
							for (let j = 0; j < i - 1; j += 1) {
								Object.assign(data, await server_promises[j]);
							}
							return data;
						}
					});

					return server_data ? unwrap_promises(server_data) : null;
				} catch (e) {
					error = /** @type {Error} */ (e);
					throw error;
				}
			});
		});

		/** @type {Array<Promise<Record<string, any> | null>>} */
		const load_promises = nodes.map((node, i) => {
			if (error) throw error;
			return Promise.resolve().then(async () => {
				try {
					const server_data = await server_promises[i];

					if (node?.module?.load) {
						const data = await node?.module?.load?.call(null, {
							url: state.prerendering ? new PrerenderingURL(event.url) : new LoadURL(event.url),
							params: event.params,
							data: server_data,
							routeId: event.routeId,
							get session() {
								if (node.module.prerender ?? options.prerender.default) {
									throw Error(
										'Attempted to access session from a prerendered page. Session would never be populated.'
									);
								}
								return $session;
							},
							fetch: fetcher,
							setHeaders: event.setHeaders,
							depends: () => {},
							parent: async () => {
								const data = {};
								for (let j = 0; j < i - 1; j += 1) {
									Object.assign(data, await load_promises[j]);
								}
								return data;
							}
						});

						return data ? unwrap_promises(data) : null;
					}

					return server_data;
				} catch (e) {
					error = /** @type {Error} */ (e);
					throw error;
				}
			});
		});

		// if we don't do this, rejections will be unhandled
		for (const p of server_promises) p.catch(() => {});
		for (const p of load_promises) p.catch(() => {});

		for (let i = 0; i < nodes.length; i += 1) {
			const node = nodes[i];

			if (node) {
				try {
					branch.push({
						node,
						server_data: await server_promises[i],
						data: await load_promises[i]
					});
				} catch (error) {
					if (/** @type {Redirect} */ (error).__is_redirect) {
						return Response.redirect(new URL(error.location, event.url), error.status);
					}

					if (!error.__is_http_error) {
						options.handle_error(error, event);
					}

					const status = error.__is_http_error ? error.status : 500;

					while (i--) {
						if (route.errors[i]) {
							const index = /** @type {number} */ (route.errors[i]);
							const node = await options.manifest._.nodes[index]();

							let j = i;
							while (!branch[j]) j -= 1;

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
									.concat({ node, data: null, server_data: null }),
								fetched
							});
						}
					}

					// if we're still here, it means the error happened in the root layout,
					// which means we have to fall back to a plain text response
					// TODO since the requester is expecting HTML, maybe it makes sense to
					// doll this up a bit
					return new Response(options.get_stack(error) || error.message, { status });
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
			page_config: get_page_config(leaf_node, options),
			status: 200, // TODO unless POST/PUT/PATCH/DELETE thinks otherwise
			error: null,
			branch: branch.filter(Boolean),
			fetched
		});
	} catch (error) {
		// if we end up here, it means the data loaded successfull
		// but the page failed to render
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
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} mod
 */
async function handle_json_request(event, options, mod) {
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
		if (error?.__is_redirect) {
			return Response.redirect(new URL(error.location, event.url), error.status);
		}

		if (error?.__is_http_error) {
			return json_response({ message: error.message }, error.status);
		}

		return json_response(clone_error(error, options.get_stack), 500);
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

/** @param {Record<string, any>} object */
async function unwrap_promises(object) {
	/** @type {import('types').JSONObject} */
	const unwrapped = {};

	for (const key in object) {
		unwrapped[key] = await object[key];
	}

	return unwrapped;
}
