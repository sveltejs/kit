import { devalue } from 'devalue';
import { negotiate } from '../../../utils/http.js';
import { render_response } from './render.js';
import { respond_with_error } from './respond_with_error.js';
import {
	method_not_allowed,
	error_to_pojo,
	allowed_methods,
	get_option,
	static_error_page
} from '../utils.js';
import { create_fetch } from './fetch.js';
import { HttpError, Redirect } from '../../control.js';
import { error, json } from '../../../exports/index.js';
import { compact } from '../../../utils/array.js';
import { normalize_error } from '../../../utils/error.js';
import { load_data, load_server_data } from './load_data.js';
import { DATA_SUFFIX } from '../../../constants.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 * @typedef {import('types').SSRNode} SSRNode
 * @typedef {import('types').SSROptions} SSROptions
 * @typedef {import('types').SSRState} SSRState
 */

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRRoute} route
 * @param {import('types').PageNodeIndexes} page
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @param {import('types').RequiredResolveOptions} resolve_opts
 * @returns {Promise<Response>}
 */
export async function render_page(event, route, page, options, state, resolve_opts) {
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

	if (
		accept === 'application/json' &&
		event.request.method !== 'GET' &&
		event.request.method !== 'HEAD'
	) {
		const node = await options.manifest._.nodes[page.leaf]();
		if (node.server) {
			return handle_json_request(event, options, node.server);
		}
	}

	try {
		const nodes = await Promise.all([
			// we use == here rather than === because [undefined] serializes as "[null]"
			...page.layouts.map((n) => (n == undefined ? n : options.manifest._.nodes[n]())),
			options.manifest._.nodes[page.leaf]()
		]);

		const leaf_node = /** @type {import('types').SSRNode} */ (nodes.at(-1));

		let status = 200;

		/** @type {HttpError | Error} */
		let mutation_error;

		/** @type {Record<string, string> | undefined} */
		let validation_errors;

		if (leaf_node.server && event.request.method !== 'GET' && event.request.method !== 'HEAD') {
			// for non-GET requests, first call handler in +page.server.js
			// (this also determines status code)
			try {
				const method = /** @type {'POST' | 'PATCH' | 'PUT' | 'DELETE'} */ (event.request.method);
				const handler = leaf_node.server[method];
				if (handler) {
					const result = await handler.call(null, event);

					if (result?.errors) {
						validation_errors = result.errors;
						status = result.status ?? 400;
					}

					if (event.request.method === 'POST' && result?.location) {
						return redirect_response(303, result.location);
					}
				} else {
					event.setHeaders({
						allow: allowed_methods(leaf_node.server).join(', ')
					});

					mutation_error = error(405, 'Method not allowed');
				}
			} catch (e) {
				if (e instanceof Redirect) {
					return redirect_response(e.status, e.location);
				}

				mutation_error = /** @type {HttpError | Error} */ (e);
			}
		}

		const should_prerender_data = nodes.some((node) => node?.server);
		const data_pathname = event.url.pathname.replace(/\/$/, '') + DATA_SUFFIX;

		// it's crucial that we do this before returning the non-SSR response, otherwise
		// SvelteKit will erroneously believe that the path has been prerendered,
		// causing functions to be omitted from the manifesst generated later
		const should_prerender = get_option(nodes, 'prerender') ?? false;
		if (should_prerender) {
			const mod = leaf_node.server;
			if (mod && (mod.POST || mod.PUT || mod.DELETE || mod.PATCH)) {
				throw new Error('Cannot prerender pages that have mutative methods');
			}
		} else if (state.prerendering) {
			// if the page isn't marked as prerenderable, then bail out at this point
			return new Response(undefined, {
				status: 204
			});
		}

		const { fetcher, fetched, cookies } = create_fetch({
			event,
			options,
			state,
			route,
			prerender_default: should_prerender
		});

		if (get_option(nodes, 'ssr') === false) {
			return await render_response({
				branch: [],
				validation_errors: undefined,
				fetched,
				cookies,
				page_config: {
					ssr: false,
					csr: get_option(nodes, 'csr') ?? true
				},
				status,
				error: null,
				event,
				options,
				state,
				resolve_opts
			});
		}

		/** @type {Array<Loaded | null>} */
		let branch = [];

		/** @type {Error | null} */
		let load_error = null;

		/** @type {Array<Promise<import('types').ServerDataNode | null>>} */
		const server_promises = nodes.map((node, i) => {
			if (load_error) {
				// if an error happens immediately, don't bother with the rest of the nodes
				throw load_error;
			}

			return Promise.resolve().then(async () => {
				try {
					if (node === leaf_node && mutation_error) {
						// we wait until here to throw the error so that we can use
						// any nested +error.svelte components that were defined
						throw mutation_error;
					}

					return await load_server_data({
						event,
						state,
						node,
						parent: async () => {
							/** @type {Record<string, any>} */
							const data = {};
							for (let j = 0; j < i; j += 1) {
								const parent = await server_promises[j];
								if (parent) Object.assign(data, await parent.data);
							}
							return data;
						}
					});
				} catch (e) {
					load_error = /** @type {Error} */ (e);
					throw load_error;
				}
			});
		});

		/** @type {Array<Promise<Record<string, any> | null>>} */
		const load_promises = nodes.map((node, i) => {
			if (load_error) throw load_error;
			return Promise.resolve().then(async () => {
				try {
					return await load_data({
						event,
						fetcher,
						node,
						parent: async () => {
							const data = {};
							for (let j = 0; j < i; j += 1) {
								Object.assign(data, await load_promises[j]);
							}
							return data;
						},
						server_data_promise: server_promises[i],
						state
					});
				} catch (e) {
					load_error = /** @type {Error} */ (e);
					throw load_error;
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
					const server_data = await server_promises[i];
					const data = await load_promises[i];

					branch.push({ node, server_data, data });
				} catch (e) {
					const error = normalize_error(e);

					if (error instanceof Redirect) {
						if (state.prerendering && should_prerender_data) {
							const body = `window.__sveltekit_data = ${JSON.stringify({
								type: 'redirect',
								location: error.location
							})}`;

							state.prerendering.dependencies.set(data_pathname, {
								response: new Response(body),
								body
							});
						}

						return redirect_response(error.status, error.location);
					}

					if (!(error instanceof HttpError)) {
						options.handle_error(/** @type {Error} */ (error), event);
					}

					const status = error instanceof HttpError ? error.status : 500;

					while (i--) {
						if (page.errors[i]) {
							const index = /** @type {number} */ (page.errors[i]);
							const node = await options.manifest._.nodes[index]();

							let j = i;
							while (!branch[j]) j -= 1;

							return await render_response({
								event,
								options,
								state,
								resolve_opts,
								page_config: { ssr: true, csr: true },
								status,
								error,
								branch: compact(branch.slice(0, j + 1)).concat({
									node,
									data: null,
									server_data: null
								}),
								fetched,
								cookies,
								validation_errors: undefined
							});
						}
					}

					// if we're still here, it means the error happened in the root layout,
					// which means we have to fall back to error.html
					return static_error_page(
						options,
						status,
						/** @type {HttpError | Error} */ (error).message
					);
				}
			} else {
				// push an empty slot so we can rewind past gaps to the
				// layout that corresponds with an +error.svelte page
				branch.push(null);
			}
		}

		if (state.prerendering && should_prerender_data) {
			const body = `window.__sveltekit_data = ${devalue({
				type: 'data',
				nodes: branch.map((branch_node) => branch_node?.server_data)
			})}`;

			state.prerendering.dependencies.set(data_pathname, {
				response: new Response(body),
				body
			});
		}

		// TODO use validation_errors

		return await render_response({
			event,
			options,
			state,
			resolve_opts,
			page_config: {
				csr: get_option(nodes, 'csr') ?? true,
				ssr: true
			},
			status,
			error: null,
			branch: compact(branch),
			validation_errors,
			fetched,
			cookies
		});
	} catch (error) {
		// if we end up here, it means the data loaded successfull
		// but the page failed to render, or that a prerendering error occurred
		options.handle_error(/** @type {Error} */ (error), event);

		return await respond_with_error({
			event,
			options,
			state,
			status: 500,
			error: /** @type {Error} */ (error),
			resolve_opts
		});
	}
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} mod
 */
export async function handle_json_request(event, options, mod) {
	const method = /** @type {'POST' | 'PUT' | 'PATCH' | 'DELETE'} */ (event.request.method);
	const handler = mod[method];

	if (!handler) {
		return method_not_allowed(mod, method);
	}

	try {
		// @ts-ignore
		const result = await handler.call(null, event);

		if (result?.errors) {
			// @ts-ignore
			return json({ errors: result.errors }, { status: result.status || 400 });
		}

		return new Response(undefined, {
			status: 204,
			// @ts-ignore
			headers: result?.location ? { location: result.location } : undefined
		});
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			return redirect_response(error.status, error.location);
		}

		if (!(error instanceof HttpError)) {
			options.handle_error(error, event);
		}

		return json(error_to_pojo(error, options.get_stack), {
			status: error instanceof HttpError ? error.status : 500
		});
	}
}

/**
 * @param {number} status
 * @param {string} location
 */
function redirect_response(status, location) {
	return new Response(undefined, {
		status,
		headers: { location }
	});
}
