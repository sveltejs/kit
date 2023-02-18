import { HttpError, Redirect } from '../../control.js';
import { normalize_error } from '../../../utils/error.js';
import { once } from '../../../utils/functions.js';
import { load_server_data } from '../page/load_data.js';
import { clarify_devalue_error, handle_error_and_jsonify, stringify_uses } from '../utils.js';
import { normalize_path } from '../../../utils/url.js';
import { text } from '../../../exports/index.js';
import * as devalue from 'devalue';
import { to_generator } from '../../../utils/generators.js';

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

		const chunks = get_data_json(event, options, nodes);
		const { value: first } = await chunks.next();

		if (!first?.has_more) {
			// use a normal JSON response where possible, so we get `content-length`
			// and can use browser JSON devtools for easier inspecting
			return json_response(/** @type {NonNullable<typeof first>} */ (first).data);
		}

		return new Response(
			new ReadableStream({
				async start(controller) {
					controller.enqueue(/** @type {NonNullable<typeof first>} */ (first).data);
					for await (const next of chunks) {
						controller.enqueue(next.data);
					}
					controller.close();
				}
			}),
			{
				headers: {
					// text/plain isn't strictly correct, but it makes it easier to inspect
					// the data, and doesn't affect how it is consumed by the client
					'content-type': 'text/plain',
					'cache-control': 'private, no-store'
				}
			}
		);
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

export const get_data_json = to_generator(_get_data_json);

/**
 * The first chunk returns the devalue'd nodes with potentially pending promises.
 * Subsequent chunks (if any) return the resolved promises.
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {Array<import('types').ServerDataSkippedNode | import('types').ServerDataNode | import('types').ServerErrorNode | null | undefined>} nodes
 * @param {(result: {has_more: boolean; data: any}, done: boolean) => void} next
 */
async function _get_data_json(event, options, nodes, next) {
	let promise_id = 1;
	let count = 0;
	let strings = [];

	const revivers = {
		/** @param {any} thing */
		Promise: (thing) => {
			if (typeof thing?.then === 'function') {
				const id = promise_id++;
				count += 1;

				thing
					.then(/** @param {any} d */ (d) => ({ d }))
					.catch(/** @param {any} e */ (e) => ({ e }))
					.then(
						/**
						 * @param {{d: any; e: any}} result
						 */
						async ({ d, e }) => {
							let data;
							let error;
							try {
								if (e) {
									error = devalue.stringify(e, revivers);
								} else {
									data = devalue.stringify(d, revivers);
								}
							} catch (e) {
								error = await handle_error_and_jsonify(
									event,
									options,
									new Error(clarify_devalue_error(event, /** @type {any} */ (e)))
								);
							}

							count -= 1;

							next(
								{
									has_more: count !== 0,
									data: `{"type":"chunk","id":${id}${data ? `,"data":${data}` : ''}${
										error ? `,"error":${error}` : ''
									}}\n`
								},
								count === 0
							);
						}
					);

				return id;
			}
		}
	};

	try {
		for (const node of nodes) {
			let str = '';

			if (!node) {
				str = 'null';
			} else if (node.type === 'error' || node.type === 'skip') {
				str = JSON.stringify(node);
			} else {
				const uses_str = stringify_uses(node);

				str = `{"type":"data","data":${devalue.stringify(node.data, revivers)},${uses_str}${
					node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ''
				}}`;
			}

			strings.push(str);
		}

		next(
			{ has_more: count !== 0, data: `{"type":"data","nodes":[${strings.join(',')}]}\n` },
			count === 0
		);
	} catch (e) {
		throw new Error(clarify_devalue_error(event, /** @type {any} */ (e)));
	}
}
