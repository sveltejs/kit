import { HttpError, Redirect } from '../../control.js';
import { normalize_error } from '../../../utils/error.js';
import { once } from '../../../utils/functions.js';
import { load_server_data } from '../page/load_data.js';
import { data_response, handle_error_and_jsonify } from '../utils.js';
import { normalize_path } from '../../../utils/url.js';
import { DATA_SUFFIX } from '../../../constants.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRRoute} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @returns {Promise<Response>}
 */
export async function render_data(event, route, options, state) {
	if (!route.page) {
		// requesting /__data.json should fail for a +server.js
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

		const url = new URL(event.url);
		url.pathname = normalize_path(
			url.pathname.slice(0, -DATA_SUFFIX.length),
			options.trailing_slash
		);

		const new_event = { ...event, url };

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
						event: new_event,
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
				p.catch((error) => {
					if (error instanceof Redirect) {
						throw error;
					}

					// Math.min because array isn't guaranteed to resolve in order
					length = Math.min(length, i + 1);

					return /** @type {import('types').ServerErrorNode} */ ({
						type: 'error',
						error: handle_error_and_jsonify(event, options, error),
						status: error instanceof HttpError ? error.status : undefined
					});
				})
			)
		);

		/** @type {import('types').ServerData} */
		const server_data = {
			type: 'data',
			nodes: nodes.slice(0, length)
		};

		return data_response(server_data, event);
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			/** @type {import('types').ServerData} */
			const server_data = {
				type: 'redirect',
				location: error.location
			};

			return data_response(server_data, event);
		} else {
			// TODO make it clearer that this was an unexpected error
			return data_response(handle_error_and_jsonify(event, options, error), event);
		}
	}
}
