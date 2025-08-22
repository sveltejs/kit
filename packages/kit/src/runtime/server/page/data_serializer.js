import * as devalue from 'devalue';
import { create_async_iterator } from '../../../utils/streaming.js';
import { clarify_devalue_error, handle_error_and_jsonify, serialize_uses } from '../utils.js';

/**
 * If the serialized data contains promises, `chunks` will be an
 * async iterable containing their resolutions
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} event_state
 * @param {import('types').SSROptions} options
 * @returns {import('./types.js').ServerDataSerializer}
 */
export function server_data_serializer(event, event_state, options) {
	let promise_id = 1;
	let count = 0;

	const { iterator, push, done } = create_async_iterator();
	const global_placeholder = `__GLOBAL__${Math.random().toString(36).slice(2)}__`;

	/** @type {(info: { global: string; nonce: string; }) => void} */
	let set_info;
	const info = /** @type {Promise<{ global: string; nonce: string }>} */ new Promise(
		(r) => (set_info = r)
	);

	/** @param {any} thing */
	function replacer(thing) {
		if (typeof thing?.then === 'function') {
			const id = promise_id++;
			count += 1;

			thing
				.then(/** @param {any} data */ (data) => ({ data }))
				.catch(
					/** @param {any} error */ async (error) => ({
						error: await handle_error_and_jsonify(event, event_state, options, error)
					})
				)
				.then(
					/**
					 * @param {{data: any; error: any}} result
					 */
					async ({ data, error }) => {
						count -= 1;

						let str;
						try {
							str = devalue.uneval(error ? [, error] : [data], replacer);
						} catch {
							error = await handle_error_and_jsonify(
								event,
								event_state,
								options,
								new Error(`Failed to serialize promise while rendering ${event.route.id}`)
							);
							data = undefined;
							str = devalue.uneval([, error], replacer);
						}

						const { nonce, global } = await info;
						push(
							`<script${nonce}>${global}.resolve(${id}, ${str.includes('app.decode') ? `(app) => ${str}` : `() => ${str}`})</script>\n`
						);
						if (count === 0) done();
					}
				);

			return `${global_placeholder}.defer(${id})`;
		} else {
			for (const key in options.hooks.transport) {
				const encoded = options.hooks.transport[key].encode(thing);
				if (encoded) {
					return `app.decode('${key}', ${devalue.uneval(encoded, replacer)})`;
				}
			}
		}
	}

	const strings = /** @type {string[]} */ ([]);

	return {
		serialize(i, node) {
			try {
				if (!node) {
					strings[i] = 'null';
					return;
				}

				/** @type {any} */
				const payload = { type: 'data', data: node.data, uses: serialize_uses(node) };
				if (node.slash) payload.slash = node.slash;

				strings[i] = devalue.uneval(payload, replacer);
			} catch (e) {
				// @ts-expect-error
				e.path = e.path.slice(1);
				throw new Error(clarify_devalue_error(event, /** @type {any} */ (e)));
			}
		},

		get_data(csp, global) {
			set_info({ global, nonce: csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : '' });
			return {
				data: `[${strings.join(',').replaceAll(global_placeholder, global)}]`,
				chunks: count > 0 ? iterator : null
			};
		}
	};
}

/**
 * If the serialized data contains promises, `chunks` will be an
 * async iterable containing their resolutions
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} event_state
 * @param {import('types').SSROptions} options
 * @returns {import('./types.js').ServerDataSerializerJson}
 */
export function server_data_serializer_json(event, event_state, options) {
	let promise_id = 1;
	let count = 0;

	const { iterator, push, done } = create_async_iterator();

	const reducers = {
		...Object.fromEntries(
			Object.entries(options.hooks.transport).map(([key, value]) => [key, value.encode])
		),
		/** @param {any} thing */
		Promise: (thing) => {
			if (typeof thing?.then === 'function') {
				const id = promise_id++;
				count += 1;

				/** @type {'data' | 'error'} */
				let key = 'data';

				thing
					.catch(
						/** @param {any} e */ async (e) => {
							key = 'error';
							return handle_error_and_jsonify(event, event_state, options, /** @type {any} */ (e));
						}
					)
					.then(
						/** @param {any} value */
						async (value) => {
							let str;
							try {
								str = devalue.stringify(value, reducers);
							} catch {
								const error = await handle_error_and_jsonify(
									event,
									event_state,
									options,
									new Error(`Failed to serialize promise while rendering ${event.route.id}`)
								);

								key = 'error';
								str = devalue.stringify(error, reducers);
							}

							count -= 1;

							push(`{"type":"chunk","id":${id},"${key}":${str}}\n`);
							if (count === 0) done();
						}
					);

				return id;
			}
		}
	};

	const strings = /** @type {string[]} */ ([]);

	return {
		serialize(i, node) {
			try {
				if (!node) {
					strings[i] = 'null';
					return;
				}

				if (node.type === 'error' || node.type === 'skip') {
					strings[i] = JSON.stringify(node);
					return;
				}

				return `{"type":"data","data":${devalue.stringify(node.data, reducers)},"uses":${JSON.stringify(
					serialize_uses(node)
				)}${node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ''}}`;
			} catch (e) {
				// @ts-expect-error
				e.path = 'data' + e.path;
				throw new Error(clarify_devalue_error(event, /** @type {any} */ (e)));
			}
		},

		get_data() {
			return {
				data: `{"type":"data","nodes":[${strings.join(',')}]}\n`,
				chunks: count > 0 ? iterator : null
			};
		}
	};
}
