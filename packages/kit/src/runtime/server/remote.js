/** @import { ActionResult, RemoteForm, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFormInternals, RemoteFunctionResponse, RemoteInternals, RemoteResourceCode, RemoteSingleflightEntry, RequestState, SSROptions } from 'types' */

import { json, error } from '@sveltejs/kit';
import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing } from '@sveltejs/kit/internal/server';
import { app_dir, base } from '$app/paths/internal/server';
import { is_form_content_type } from '../../utils/http.js';
import { parse_remote_arg, split_remote_key, stringify } from '../shared.js';
import { serialize_remote_result } from '../app/server/remote/shared.js';
import { handle_error_and_jsonify } from './utils.js';
import { normalize_error } from '../../utils/error.js';
import { check_incorrect_fail_use } from './page/actions.js';
import { DEV } from 'esm-env';
import { record_span } from '../telemetry/record_span.js';
import { deserialize_binary_form } from '../form-utils.js';

/** @type {typeof handle_remote_call_internal} */
export async function handle_remote_call(event, state, options, manifest, id) {
	return record_span({
		name: 'sveltekit.remote.call',
		attributes: {
			'sveltekit.remote.call.id': id
		},
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () =>
				handle_remote_call_internal(traced_event, state, options, manifest, id)
			);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} id
 */
async function handle_remote_call_internal(event, state, options, manifest, id) {
	const [hash, name, additional_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const fn = module.default[name];

	if (!fn) error(404);

	/** @type {RemoteInternals} */
	const internals = fn.__;
	const transport = options.hooks.transport;

	event.tracing.current.setAttributes({
		'sveltekit.remote.call.type': internals.type,
		'sveltekit.remote.call.name': internals.name
	});

	try {
		if (internals.type === 'query_batch') {
			if (event.request.method !== 'POST') {
				throw new SvelteKitError(
					405,
					'Method Not Allowed',
					`\`query.batch\` functions must be invoked via POST request, not ${event.request.method}`
				);
			}

			/** @type {{ payloads: string[] }} */
			const { payloads } = await event.request.json();

			const args = await Promise.all(
				payloads.map((payload) => parse_remote_arg(payload, transport))
			);

			const results = await with_request_store({ event, state }, () =>
				internals.run(args, options)
			);

			// `results` is an array of `{ type, data }` entries whose `data` was already
			// serialized (via `serialize_remote_result`) per-entry inside `run`, collecting any
			// nested pointers into `state.remote.collected` along the way.
			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(results, transport),
					queries: await build_queries()
				})
			);
		}

		if (internals.type === 'form') {
			if (event.request.method !== 'POST') {
				throw new SvelteKitError(
					405,
					'Method Not Allowed',
					`\`form\` functions must be invoked via POST request, not ${event.request.method}`
				);
			}

			if (!is_form_content_type(event.request)) {
				throw new SvelteKitError(
					415,
					'Unsupported Media Type',
					`\`form\` functions expect form-encoded data — received ${event.request.headers.get(
						'content-type'
					)}`
				);
			}

			const { data, meta, form_data } = await deserialize_binary_form(event.request);
			state.remote.requested = create_requested_map(meta.remote_refreshes);

			// If this is a keyed form instance (created via form.for(key)), add the key to the form data (unless already set)
			// Note that additional_args will only be set if the form is not enhanced, as enhanced forms transfer the key inside `data`.
			if (additional_args && !('id' in data)) {
				data.id = JSON.parse(decodeURIComponent(additional_args));
			}

			const fn = internals.fn;
			const result = await with_request_store({ event, state }, () => fn(data, meta, form_data));

			const result_string = serialize_remote_result(result, state);
			const reconnects = result.issues ? undefined : await serialize_reconnects();

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: result_string,
					queries: result.issues ? undefined : await build_queries(),
					reconnects
				})
			);
		}

		if (internals.type === 'command') {
			/** @type {{ payload: string, refreshes?: string[] }} */
			const { payload, refreshes } = await event.request.json();
			state.remote.requested = create_requested_map(refreshes);
			const arg = parse_remote_arg(payload, transport);
			const data = await with_request_store({ event, state }, () => fn(arg));

			const result_string = serialize_remote_result(data, state);
			const reconnects = await serialize_reconnects();

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: result_string,
					queries: await build_queries(),
					reconnects
				})
			);
		}

		if (internals.type === 'query_live') {
			if (event.request.method !== 'GET') {
				throw new SvelteKitError(
					405,
					'Method Not Allowed',
					`\`query.live\` functions must be invoked via GET request, not ${event.request.method}`
				);
			}

			const payload = /** @type {string} */ (
				new URL(event.request.url).searchParams.get('payload')
			);

			const generator = internals.run(event, state, parse_remote_arg(payload, transport));

			const encoder = new TextEncoder();

			/**
			 * @param {ReadableStreamDefaultController} controller
			 * @param {any} payload
			 */
			function send(controller, payload) {
				controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
			}

			let closed = false;

			/** @type {string | undefined} */
			let result = undefined;

			async function cancel() {
				if (closed) return;
				closed = true;
				await generator.return(undefined);
			}

			event.request.signal.addEventListener('abort', cancel, { once: true });

			return new Response(
				new ReadableStream({
					async pull(controller) {
						if (event.request.signal.aborted) {
							await cancel();
							controller.close();
							return;
						}

						try {
							while (true) {
								const { value, done } = await generator.next();

								if (done) {
									await cancel();
									controller.close();
									return;
								}

								// only send changed data
								if (result !== (result = serialize_remote_result(value, state))) {
									// ship any nested query/prerender values used by this emitted value in a
									// per-message `queries` side-channel so the client can revive their
									// pointers without a separate request. Collected pointers accumulate on
									// `state.remote`, so clear them afterwards to keep each message self-contained.
									const queries = await build_queries();
									state.remote.collected?.clear();

									send(controller, {
										type: 'result',
										result,
										queries
									});

									return;
								}
							}
						} catch (error) {
							if (!event.request.signal.aborted) {
								if (error instanceof Redirect) {
									send(controller, {
										type: 'redirect',
										location: error.location
									});
								} else {
									const status =
										error instanceof HttpError || error instanceof SvelteKitError
											? error.status
											: 500;

									send(controller, {
										type: 'error',
										error: await handle_error_and_jsonify(event, state, options, error),
										status
									});
								}
							}

							await cancel();
							controller.close();
						}
					},
					cancel
				}),
				{
					headers: {
						'cache-control': 'private, no-store',
						'content-type': 'application/x-ndjson'
					}
				}
			);
		}

		const payload =
			internals.type === 'prerender'
				? additional_args
				: /** @type {string} */ (
						// new URL(...) necessary because we're hiding the URL from the user in the event object
						new URL(event.request.url).searchParams.get('payload')
					);

		const data = await with_request_store({ event, state }, () =>
			fn(parse_remote_arg(payload, transport))
		);

		// prerender results may only nest other prerenders (allow_queries: false)
		const result_string = serialize_remote_result(data, state, internals.type !== 'prerender');

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'result',
				result: result_string,
				queries: await build_queries()
			})
		);
	} catch (error) {
		if (error instanceof Redirect) {
			const reconnects = await serialize_reconnects();
			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'redirect',
					location: error.location,
					queries: await build_queries(),
					reconnects
				})
			);
		}

		const status =
			error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'error',
				error: await handle_error_and_jsonify(event, state, options, error),
				status
			}),
			{
				// By setting a non-200 during prerendering we fail the prerender process (unless handleHttpError handles it).
				// Errors at runtime will be passed to the client and are handled there
				status: state.prerendering ? status : undefined,
				headers: {
					'cache-control': 'private, no-store'
				}
			}
		);
	}

	/**
	 * Serialize a settled promise into a side-channel entry. The value is serialized via
	 * `serialize_remote_result` so it's a per-value string that may itself contain nested
	 * `[id, payload, code]` pointers (and collects their values for the `queries` channel).
	 * @param {Promise<any>} promise
	 * @param {boolean} [allow_queries=true]
	 * @returns {Promise<RemoteSingleflightEntry>}
	 */
	async function serialize_entry(promise, allow_queries = true) {
		try {
			return { type: 'result', data: serialize_remote_result(await promise, state, allow_queries) };
		} catch (error) {
			const status =
				error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;

			return {
				type: 'error',
				status,
				error: await handle_error_and_jsonify(event, state, options, error)
			};
		}
	}

	/**
	 * The live-query `reconnects` side-channel: a map of live-query key -> current value, so
	 * the client can render the latest value before re-establishing its stream.
	 */
	async function serialize_reconnects() {
		const map = state.remote.reconnects;
		if (!map || map.size === 0) return undefined;

		const entries = await Promise.all(
			Array.from(map, async ([key, promise]) => [key, await serialize_entry(promise)])
		);

		return stringify(Object.fromEntries(entries), transport);
	}

	/**
	 * The `queries` side-channel: explicit single-flight refreshes/sets *plus* every nested
	 * query/prerender that was used and referenced as a pointer in the response. Iterated to a
	 * fixpoint because serializing one value can reveal further nested pointers.
	 */
	async function build_queries() {
		/** @type {Record<string, RemoteSingleflightEntry & { code?: RemoteResourceCode }>} */
		const serialized = {};
		const seen = new Set();

		/** @type {Array<{ key: string, code: RemoteResourceCode, get_value: () => Promise<any> }>} */
		let worklist = [];

		// explicit single-flight refreshes/sets target queries already mounted on the client
		for (const [key, promise] of state.remote.refreshes ?? []) {
			if (seen.has(key)) continue;
			seen.add(key);
			worklist.push({ key, code: 'q', get_value: () => promise });
		}

		const enqueue_collected = () => {
			for (const [key, { internals, payload, code }] of state.remote.collected ?? []) {
				if (seen.has(key)) continue;
				seen.add(key);
				worklist.push({
					key,
					code,
					get_value: () =>
						Promise.resolve(/** @type {any} */ (state.remote.data?.get(internals))?.[payload]?.data)
				});
			}
		};

		enqueue_collected();

		while (worklist.length > 0) {
			const batch = worklist;
			worklist = [];

			await Promise.all(
				batch.map(async ({ key, code, get_value }) => {
					serialized[key] = { ...(await serialize_entry(get_value(), code !== 'p')), code };
				})
			);

			// serializing values above may have collected further nested pointers
			enqueue_collected();
		}

		if (Object.keys(serialized).length === 0) return undefined;

		return stringify(serialized, transport);
	}
}

/**
 * @param {string[] | undefined} refreshes
 */
function create_requested_map(refreshes) {
	/** @type {Map<string, string[]>} */
	const requested = new Map();

	for (const key of refreshes ?? []) {
		const parts = split_remote_key(key);

		const existing = requested.get(parts.id);

		if (existing) {
			existing.push(parts.payload);
		} else {
			requested.set(parts.id, [parts.payload]);
		}
	}

	return requested;
}

/** @type {typeof handle_remote_form_post_internal} */
export async function handle_remote_form_post(event, state, manifest, id) {
	return record_span({
		name: 'sveltekit.remote.form.post',
		attributes: {
			'sveltekit.remote.form.post.id': id
		},
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () =>
				handle_remote_form_post_internal(traced_event, state, manifest, id)
			);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSRManifest} manifest
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
async function handle_remote_form_post_internal(event, state, manifest, id) {
	const [hash, name, action_id] = id.split('/');
	const remotes = manifest._.remotes;
	const module = await remotes[hash]?.();

	let form = /** @type {RemoteForm<any, any>} */ (module?.default[name]);

	if (!form) {
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: 'GET'
		});
		return {
			type: 'error',
			error: new SvelteKitError(
				405,
				'Method Not Allowed',
				`POST method not allowed. No form actions exist for ${DEV ? `the page at ${event.route.id}` : 'this page'}`
			)
		};
	}

	if (action_id) {
		// @ts-expect-error
		form = with_request_store({ event, state }, () => form.for(JSON.parse(action_id)));
	}

	try {
		const fn = /** @type {RemoteFormInternals} */ (/** @type {any} */ (form).__).fn;

		const { data, meta, form_data } = await deserialize_binary_form(event.request);

		if (action_id && !('id' in data)) {
			data.id = JSON.parse(decodeURIComponent(action_id));
		}

		await with_request_store({ event, state }, () => fn(data, meta, form_data));

		// We don't want the data to appear on `let { form } = $props()`, which is why we're not returning it.
		// It is instead available on `myForm.result`, setting of which happens within the remote `form` function.
		return {
			type: 'success',
			status: 200
		};
	} catch (e) {
		const err = normalize_error(e);

		if (err instanceof Redirect) {
			return {
				type: 'redirect',
				status: err.status,
				location: err.location
			};
		}

		return {
			type: 'error',
			error: check_incorrect_fail_use(err)
		};
	}
}

/**
 * @param {URL} url
 */
export function get_remote_id(url) {
	return (
		url.pathname.startsWith(`${base}/${app_dir}/remote/`) &&
		url.pathname.replace(`${base}/${app_dir}/remote/`, '')
	);
}

/**
 * @param {URL} url
 */
export function get_remote_action(url) {
	return url.searchParams.get('/remote');
}
