import { HttpError, Redirect } from '../../../index/private.js';
import { normalize_error } from '../../../utils/error.js';
import { once } from '../../../utils/functions.js';
import { load_server_data } from '../page/load_data.js';
import { error_to_pojo } from '../utils.js';
import devalue from 'devalue';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRRoute} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @returns {Promise<Response>}
 */
export async function render_data(event, route, options, state) {
	if (!route.page) {
		// requesting /__data.js should fail for a +server.js
		return new Response(undefined, {
			status: 404
		});
	}

	try {
		const node_ids = [...route.page.layouts, route.page.leaf];

		const invalidated =
			event.request.headers.get('x-sveltekit-invalidated')?.split(',').map(Boolean) ??
			node_ids.map(() => true);

		let aborted = false;

		const functions = node_ids.map((n, i) => {
			return once(async () => {
				try {
					if (aborted) {
						return /** @type {import('types').ServerDataSkippedNode} */ ({
							type: 'skip'
						});
					}

					// == because it could be undefined (in dev) or null (in build, because of JSON.stringify)
					const node = n == undefined ? n : await options.manifest._.nodes[n]();
					return load_server_data({
						event,
						state,
						node,
						parent: async () => {
							/** @type {Record<string, any>} */
							const data = {};
							for (let j = 0; j < i; j += 1) {
								const parent = /** @type {import('types').ServerDataNode | null} */ (
									await functions[j]()
								);

								if (parent) {
									Object.assign(data, parent.data);
								}
							}
							return data;
						}
					});
				} catch (e) {
					aborted = true;
					throw e;
				}
			});
		});

		const promises = functions.map(async (fn, i) => {
			if (!invalidated[i]) {
				return /** @type {import('types').ServerDataSkippedNode} */ ({
					type: 'skip'
				});
			}

			return fn();
		});

		let length = promises.length;
		const nodes = await Promise.all(
			promises.map((p, i) =>
				p.catch((e) => {
					const error = normalize_error(e);

					if (error instanceof Redirect) {
						throw error;
					}

					// Math.min because array isn't guaranteed to resolve in order
					length = Math.min(length, i + 1);

					if (error instanceof HttpError) {
						return /** @type {import('types').ServerErrorNode} */ ({
							type: 'error',
							httperror: { ...error }
						});
					}

					options.handle_error(error, event);

					return /** @type {import('types').ServerErrorNode} */ ({
						type: 'error',
						error: error_to_pojo(error, options.get_stack)
					});
				})
			)
		);

		/** @type {import('types').ServerData} */
		const server_data = {
			type: 'data',
			nodes: nodes.slice(0, length)
		};

		return new Response(`window.__data = ${devalue(server_data)}`);
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			/** @type {import('types').ServerData} */
			const server_data = {
				type: 'redirect',
				location: error.location
			};

			return new Response(`window.__data = ${devalue(server_data)}`);
		} else {
			// TODO make it clearer that this was an unexpected error
			return new Response(`window.__data = ${devalue(error_to_pojo(error, options.get_stack))}`);
		}
	}
}
