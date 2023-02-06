import { HttpError, Redirect } from '../../control.js';
import { normalize_error } from '../../../utils/error.js';
import { once } from '../../../utils/functions.js';
import { load_server_data } from '../page/load_data.js';
import { clarify_devalue_error, handle_error_and_jsonify, serialize_data_node } from '../utils.js';
import { normalize_path } from '../../../utils/url.js';
import { text } from '../../../exports/index.js';

export const INVALIDATED_PARAM = 'x-sveltekit-invalidated';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRRoute} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRManifest} manifest
 * @param {import('types').SSRState} state
 * @param {boolean[] | undefined} invalidated_data_nodes
 * @param {import('types').TrailingSlash} trailing_slash
 * @returns {Promise<Response>}
 */
export async function render_data(
	event,
	route,
	options,
	manifest,
	state,
	invalidated_data_nodes,
	trailing_slash
) {
	if (!route.page) {
		// requesting /__data.json should fail for a +server.js
		return new Response(undefined, {
			status: 404
		});
	}

	state.initiator = route;

	try {
		const node_ids = [...route.page.layouts, route.page.leaf];
		const invalidated = invalidated_data_nodes ?? node_ids.map(() => true);

		let aborted = false;

		const url = new URL(event.url);
		url.pathname = normalize_path(url.pathname, trailing_slash);

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
					const node = n == undefined ? n : await manifest._.nodes[n]();
					// load this. for the child, return as is. for the final result, stream things
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
				p.catch(async (error) => {
					if (error instanceof Redirect) {
						throw error;
					}

					// Math.min because array isn't guaranteed to resolve in order
					length = Math.min(length, i + 1);

					return /** @type {import('types').ServerErrorNode} */ ({
						type: 'error',
						error: await handle_error_and_jsonify(event, options, error),
						status: error instanceof HttpError ? error.status : undefined
					});
				})
			)
		);

		try {
			/**
			 * @type {Array<import('types').ServerDataSkippedNode | import('types').ServerErrorNode | import('types').ServerDataNodePreSerialization | null>}
			 * The first (and possibly only, if no `defer` used) chunk sent out
			 */
			const result = [];
			/**
			 * @type {Array<{id: string; node_idx: number; promise: Promise<{id: string; node_idx: number; uses: import('types').Uses; result?: any; error?: any}>}>}
			 * List of deferred promises, to be resolved after the first chunk is sent
			 */
			let deferred = [];

			// First process all results in order, and possibly collect and setup deferred promises
			for (let node_idx = 0; node_idx < nodes.length; node_idx++) {
				const node = nodes[node_idx];
				if (!node || node.type === 'skip' || node.type === 'error' || !node.data) {
					result.push(node);
					continue;
				}

				/** @type {Record<string, any>} */
				let start = {};
				let node_uses_defer = false;

				for (const key in node.data ?? []) {
					const entry = node.data[key];
					if (typeof entry === 'object' && typeof entry?.then === 'function') {
						node_uses_defer = true;
						start[key] = `_deferred_${key}`;
						deferred.push({
							id: key,
							node_idx,
							promise: entry
								.then(
									/** @param {any} result */ (result) => ({
										id: key,
										result,
										node_idx,
										uses: node.uses
									})
								)
								.catch(/** @param {any} error */ (error) => ({ id: key, error, uses: node.uses }))
						});
					} else {
						start[key] = entry;
					}
				}

				result.push({
					type: 'data',
					data: start,
					uses: node_uses_defer ? undefined : node.uses,
					slash: node.slash
				});
			}

			// Now send the first chunk. If there are no deferred promises, we're done
			let json = '';

			try {
				json = `{"type":"data","nodes":[${result.map(serialize_data_node).join(',')}]}`;
				if (!deferred.length) {
					return json_response(json);
				}
			} catch (e) {
				const error = /** @type {any} */ (e);
				return json_response(
					await handle_error_and_jsonify(
						event,
						options,
						new Error(clarify_devalue_error(event, error))
					),
					500
				);
			}

			return new Response(
				new ReadableStream({
					async start(controller) {
						controller.enqueue(`${json}\n`);

						// Await all deferred promises and send out the rest of the chunks
						while (deferred.length) {
							const next = await Promise.race(deferred.map((d) => d.promise));
							deferred = deferred.filter((d) => d.id !== next.id);
							controller.enqueue(
								serialize_data_node(
									/** @type {import('types').ServerDataChunkNode} */ ({
										type: 'chunk',
										id: `_deferred_${next.id}`,
										data: next.result,
										error: next.error,
										// only send uses when it's the last chunk of the data node
										// so we can be sure all uses are accounted for
										uses: deferred.some((d) => d.node_idx === next.node_idx) ? undefined : next.uses
									})
								) + '\n'
							);
						}

						controller.close();
					}
				}),
				{
					headers: {
						'content-type': 'application/octet-stream'
					}
				}
			);
		} catch (e) {
			const error = /** @type {any} */ (e);
			return json_response(
				await handle_error_and_jsonify(
					event,
					options,
					new Error(clarify_devalue_error(event, error))
				),
				500
			);
		}
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			return redirect_json_response(error);
		} else {
			return json_response(await handle_error_and_jsonify(event, options, error), 500);
		}
	}
}

/**
 * @param {Record<string, any> | string} json
 * @param {number} [status]
 */
function json_response(json, status = 200) {
	return text(typeof json === 'string' ? json : JSON.stringify(json), {
		status,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'private, no-store'
		}
	});
}

/**
 * @param {Redirect} redirect
 */
export function redirect_json_response(redirect) {
	return json_response({
		type: 'redirect',
		location: redirect.location
	});
}
