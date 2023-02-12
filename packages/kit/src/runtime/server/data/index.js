import { HttpError, Redirect } from '../../control.js';
import { normalize_error } from '../../../utils/error.js';
import { once } from '../../../utils/functions.js';
import { load_server_data } from '../page/load_data.js';
import { clarify_devalue_error, handle_error_and_jsonify, serialize_data_node } from '../utils.js';
import { normalize_path } from '../../../utils/url.js';
import { text } from '../../../exports/index.js';
import * as devalue from 'devalue';

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

		return new Response(
			new ReadableStream({
				async start(controller) {
					let promise_id = 1;
					let count = 0;
					let strings = [];

					try {
						for (const node of nodes) {
							console.log('node', count);
							let node_count = 0;
							let uses_str = '';

							const revivers = {
								/** @param {any} thing */
								Promise: (thing) => {
									if (typeof thing?.then === 'function') {
										const id = promise_id++;
										count += 1;
										node_count += 1;

										thing
											.then((d) => ({ d }))
											.catch((e) => ({ e }))
											.then(
												/**
												 * @param {{d: any; e: any}} result
												 */
												async ({ d: d, e }) => {
													let data;
													let error;
													try {
														data = !e ? devalue.stringify(d, revivers) : undefined;
														error = e ? devalue.stringify(e, revivers) : undefined;
													} catch (e) {
														error = await handle_error_and_jsonify(
															event,
															options,
															new Error(clarify_devalue_error(event, /** @type {any} */ (e)))
														);
													}

													node_count -= 1;
													// only send uses when it's the last chunk of the data node
													// so we can be sure all uses are accounted for
													let uses =
														node_count === 0
															? undefined
															: stringify_uses(
																	/** @type {import('types').ServerDataNodePreSerialization} */ (
																		node
																	)
															  );
													if (uses === uses_str) {
														// No change - no need to send it
														uses = undefined;
													}

													controller.enqueue(
														`{"type":"chunk","id":${id}${data ? `,"data":${data}` : ''}${
															error ? `,"error":${error}` : ''
														}${uses ? `,"uses":${uses}` : ''}}\n`
													);

													count -= 1;
													if (count === 0) {
														controller.close();
													}
												}
											);

										return id;
									}
								}
							};

							let str = '';

							if (!node) {
								str = 'null';
							} else if (node.type === 'error' || node.type === 'skip') {
								str = JSON.stringify(node);
							} else {
								uses_str = stringify_uses(node);

								str = `{"type":"data","data":${devalue.stringify(node.data, revivers)}${uses_str}${
									node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ''
								}}`;
							}

							strings.push(str);
						}

						controller.enqueue(`{"type":"data","nodes":[${strings.join(',')}]}\n`);

						if (count === 0) {
							controller.close();
						}
					} catch (e) {
						const error = await handle_error_and_jsonify(
							event,
							options,
							new Error(clarify_devalue_error(event, /** @type {any} */ (e)))
						);
						controller.enqueue(error); // TODO should this be .error(..) ? how does frontend know this failed right away? status is 200
						controller.close();
					}
				}
			}),
			{
				headers: {
					'content-type': 'application/x-ndjson'
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
 * @param {import('types').ServerDataNodePreSerialization} node
 */
function stringify_uses(node) {
	const uses = [];

	if (node.uses && node.uses.dependencies.size > 0) {
		uses.push(`"dependencies":${JSON.stringify(Array.from(node.uses.dependencies))}`);
	}

	if (node.uses && node.uses.params.size > 0) {
		uses.push(`"params":${JSON.stringify(Array.from(node.uses.params))}`);
	}

	if (node.uses?.parent) uses.push(`"parent":1`);
	if (node.uses?.route) uses.push(`"route":1`);
	if (node.uses?.url) uses.push(`"url":1`);

	return node.uses ? `,"uses":{${uses.join(',')}}` : '';
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
