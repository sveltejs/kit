/** @import { ActionResult, RemoteForm, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFormInternals, RemoteFunctionData, RemoteFunctionResponse, RemoteInternals, RequestState, SSROptions } from 'types' */

import { json, error } from '@sveltejs/kit';
import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing } from '@sveltejs/kit/internal/server';
import { app_dir, base } from '$app/paths/internal/server';
import { is_form_content_type } from '../../utils/http.js';
import { create_remote_key, parse_remote_arg, split_remote_key, stringify } from '../shared.js';
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

	/** @type {HeadersInit | undefined} */
	const headers = state.prerendering ? undefined : { 'cache-control': 'private, no-store' };

	try {
		/** @type {RemoteFunctionData} */
		const data = {};

		switch (internals.type) {
			case 'query_live': {
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
					controller.enqueue(encoder.encode('data: ' + JSON.stringify(payload) + '\n\n'));
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
									if (result !== (result = stringify(value, transport))) {
										send(controller, {
											type: 'result',
											result
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
							'content-type': 'text/event-stream'
						}
					}
				);
			}

			case 'query_batch': {
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

				data._ = await with_request_store({ event, state }, () => internals.run(args, options));

				break;
			}

			case 'form': {
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

				const { data: input, meta, form_data } = await deserialize_binary_form(event.request);
				state.remote.requested = create_requested_map(meta.remote_refreshes);

				// If this is a keyed form instance (created via form.for(key)), add the key to the form data (unless already set)
				// Note that additional_args will only be set if the form is not enhanced, as enhanced forms transfer the key inside `data`.
				if (additional_args && !('id' in input)) {
					input.id = JSON.parse(decodeURIComponent(additional_args));
				}

				const fn = internals.fn;
				data._ = await with_request_store(
					{ event, state: { ...state, is_in_remote_form_or_command: true } },
					() => fn(input, meta, form_data)
				);

				if (data._.issues) {
					// special case — don't serialize refreshes/reconnects
					return json(
						/** @type {RemoteFunctionResponse} */ ({
							type: 'result',
							data: stringify(data, transport)
						}),
						{ headers }
					);
				}

				break;
			}

			case 'command': {
				/** @type {{ payload: string, refreshes?: string[] }} */
				const { payload, refreshes } = await event.request.json();
				state.remote.requested = create_requested_map(refreshes);
				const arg = parse_remote_arg(payload, transport);

				data._ = await with_request_store(
					{ event, state: { ...state, is_in_remote_form_or_command: true } },
					() => fn(arg)
				);

				break;
			}

			case 'prerender': {
				data._ = await with_request_store({ event, state }, () =>
					fn(parse_remote_arg(additional_args, transport))
				);

				break;
			}

			case 'query': {
				const payload = /** @type {string} */ (
					// new URL(...) necessary because we're hiding the URL from the user in the event object
					new URL(event.request.url).searchParams.get('payload')
				);

				data._ = await with_request_store({ event, state }, () =>
					fn(parse_remote_arg(payload, transport))
				);

				break;
			}
		}

		await collect_remote_data(data, event, state, options);

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'result',
				data: stringify(data, transport)
			}),
			{ headers }
		);
	} catch (error) {
		if (error instanceof Redirect) {
			const data = await collect_remote_data({ redirect: error.location }, event, state, options);

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					data: stringify(data, transport)
				}),
				{ headers }
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
}

/**
 * Collects all the query/prerender data that was retrieved
 * during the request and adds it to `data`
 * @param {RemoteFunctionData} data
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 */
export async function collect_remote_data(data, event, state, options) {
	/**
	 *
	 * @param {unknown} error
	 * @returns {Promise<[status: number, error: App.Error]>}
	 */
	async function convert_error(error) {
		const status =
			error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;

		return [status, await handle_error_and_jsonify(event, state, options, error)];
	}

	/** @type {Promise<any>[]} */
	const promises = [];

	if (state.remote.explicit) {
		for (const [remote_key, { internals, promise }] of state.remote.explicit) {
			// there were explicit refreshes/reconnects (via `refresh()`/`set()`/`reconnect()`),
			// so the client should apply these single-flight updates instead of calling `invalidateAll()`
			data.r = true;

			const type = /** @type {'p' | 'q' | 'l'} */ (
				internals.type === 'query_live' ? 'l' : internals.type[0]
			);

			await promise.then(
				(v) => {
					((data[type] ??= {})[remote_key] ??= {}).v = v;
				},
				async (e) => {
					if (e instanceof Redirect) {
						// already handled elsewhere
						return;
					}

					((data[type] ??= {})[remote_key] ??= {}).e = await convert_error(e);
				}
			);
		}
	}

	await Promise.all(promises);

	if (state.remote.implicit) {
		for (const [internals, record] of state.remote.implicit) {
			// Private (non-exported) remote functions have no `id` and must never be
			// serialized into the response — otherwise their (potentially private) result
			// would be shipped to the client under a malformed `undefined/...` key.
			if (!internals.id) continue;

			for (const key in record) {
				// form outputs are registered under the client-side action id directly
				const remote_key = internals.type === 'form' ? key : create_remote_key(internals.id, key);

				const type = /** @type {'p' | 'q' | 'l' | 'f'} */ (
					internals.type === 'query_live' ? 'l' : internals.type[0]
				);

				const promise = state.remote.data?.get(internals)?.[key] ?? record[key]();

				// If the promise is still pending (e.g. the query was rendered in its loading
				// state during SSR), omit it from the payload entirely so that the client
				// fetches it itself — an entry without `v`/`e` would hydrate as `undefined`.
				let resolved = true;

				await Promise.race([
					Promise.resolve(promise).then(
						(v) => {
							if (resolved) {
								((data[type] ??= {})[remote_key] ??= {}).v = v;
							}
						},
						(e) => {
							if (e instanceof Redirect) {
								// already handled elsewhere
								return;
							}

							if (resolved) {
								promises.push(
									convert_error(e).then((e) => {
										((data[type] ??= {})[remote_key] ??= {}).e = e;
									})
								);
							}
						}
					),
					Promise.resolve().then(() => (resolved = false))
				]);
			}
		}
	}

	await Promise.all(promises);

	return data;
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
	// `hash` and `name` can never contain a `/`, but the JSON-stringified key of a
	// keyed (`form.for(key)`) instance can — rejoin the remaining segments
	const [hash, name, ...rest] = id.split('/');
	const action_id = rest.join('/');
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

		await with_request_store(
			{ event, state: { ...state, is_in_remote_form_or_command: true } },
			() => fn(data, meta, form_data)
		);

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
