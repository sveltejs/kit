/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RemoteForm } from '$app/server' */
/** @import { RemoteFormInternals, RemoteFunctionData, RemoteFunctionResponse, RemoteInternals, RequestState, ServerActionResult } from 'types' */

import { error } from '@sveltejs/kit';
import { Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing, record_span } from '@sveltejs/kit/internal/server';
import { app_dir, base } from '#app/paths';
import { is_form_content_type } from '../../utils/http.js';
import { create_remote_key, parse_remote_arg, split_remote_key } from '../shared.js';
import { stringify } from '#app/internal/transport';
import { handle_error_and_jsonify } from './errors.js';
import {
	action_error_result,
	get_action_location,
	method_not_allowed_result
} from './page/actions.js';
import { deserialize_binary_form } from '../form-utils.js';
import { text_encoder } from '../utils.js';
import { with_version_header } from './utils.js';
import { derive_event } from './context.js';
import { manifest } from './internal.js';

/**
 * How long (in milliseconds) to wait after the last message was sent before
 * sending a `: keep-alive` SSE comment, to prevent proxies/load balancers with
 * an idle timeout from closing an otherwise-quiet `query.live` connection.
 */
const KEEP_ALIVE_INTERVAL = 30_000;

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {import('types').RemoteQueryLiveInternals} internals
 * @param {any} arg
 */
export function create_live_query_response(event, state, internals, arg) {
	const cancellation = new AbortController();
	const live_event = {
		...event,
		request: new Request(event.request, {
			signal: AbortSignal.any([event.request.signal, cancellation.signal])
		})
	};

	const generator = internals.run(live_event, state, arg);

	let open = true;
	let pulling = false;
	/** @type {ReadableStreamDefaultController<Uint8Array>} */
	let stream_controller;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let keep_alive;
	/** @type {string | undefined} */
	let result;

	function schedule_keep_alive() {
		clearTimeout(keep_alive);
		keep_alive = setTimeout(() => {
			if (!open) return;
			if ((stream_controller.desiredSize ?? 0) > 0) {
				stream_controller.enqueue(text_encoder.encode(': keep-alive\n\n'));
			}
			schedule_keep_alive();
		}, KEEP_ALIVE_INTERVAL);
	}

	/** @param {any} data */
	function send(data) {
		if (!open) return;
		stream_controller.enqueue(text_encoder.encode('data: ' + JSON.stringify(data) + '\n\n'));
		schedule_keep_alive();
	}

	/** @param {boolean} cancelled */
	function teardown(cancelled) {
		if (!open) return;
		open = false;
		clearTimeout(keep_alive);
		cancellation.abort();
		if (!cancelled) stream_controller.close();
		// AsyncGenerator.return() cannot interrupt a pending next(). Cleanup is
		// cooperative via request.signal, so stream cancellation must not await it.
		void generator.return(undefined).catch(() => {});
	}

	event.request.signal.addEventListener('abort', () => teardown(true), { once: true });

	return new Response(
		new ReadableStream({
			start(controller) {
				stream_controller = controller;
				schedule_keep_alive();
			},
			async pull() {
				if (!open || pulling) return;
				pulling = true;

				try {
					while (open) {
						const { value, done } = await generator.next();

						if (!open) return;

						if (done) {
							teardown(false);
							return;
						}

						if (result !== (result = stringify(value))) {
							send({ type: 'result', result });
							return;
						}
					}
				} catch (error) {
					if (!open) return;

					if (error instanceof Redirect) {
						send({ type: 'redirect', location: error.location });
					} else {
						const transformed = await handle_error_and_jsonify(event, state, error);

						send({ type: 'error', error: transformed });
					}

					teardown(false);
				} finally {
					pulling = false;
				}
			},
			cancel() {
				teardown(true);
			}
		}),
		{
			headers: {
				'cache-control': 'private, no-store',
				'content-type': 'text/event-stream'
			}
		}
	);
}

/** @type {typeof handle_remote_call_internal} */
export async function handle_remote_call(event, state, id) {
	return record_span({
		name: 'sveltekit.remote.call',
		attributes: {
			'sveltekit.remote.call.id': id
		},
		fn: async (current) => {
			const traced_event = merge_tracing(event, current);
			const response = await with_request_store({ event: traced_event, state }, () =>
				handle_remote_call_internal(traced_event, state, id)
			);
			return with_version_header(response);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {string} id
 */
async function handle_remote_call_internal(event, state, id) {
	const [hash, name, additional_args] = id.split('/');
	const remotes = manifest.remotes;

	if (!Object.hasOwn(remotes, hash)) error(404);

	const module = await remotes[hash]();
	const fn = Object.hasOwn(module.default, name) ? module.default[name] : undefined;

	if (!fn) error(404);

	/** @type {RemoteInternals} */
	const internals = fn.__;

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

				return create_live_query_response(event, state, internals, parse_remote_arg(payload));
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

				const args = await Promise.all(payloads.map((payload) => parse_remote_arg(payload)));

				data._ = await with_request_store({ event, state }, () => internals.run(args));

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

				const {
					data: input,
					meta,
					form_data
				} = await deserialize_binary_form(event.request, internals.id);
				state.remote.requested = create_requested_map(meta.remote_refreshes);

				// If this is a keyed form instance (created via form.for(key)), add the key to the form data (unless already set)
				// Note that additional_args will only be set if the form is not enhanced, as enhanced forms transfer the key inside `data`.
				if (additional_args && !('id' in input)) {
					input.id = JSON.parse(decodeURIComponent(additional_args));
				}

				const fn = internals.fn;
				data._ = await with_request_store(
					{ event: derive_event(event, { is_in_remote_form_or_command: true }), state },
					() => fn(input, meta, form_data)
				);

				if (data._.issues) {
					// special case — don't serialize refreshes/reconnects
					return Response.json(
						/** @type {RemoteFunctionResponse} */ ({
							type: 'result',
							data: stringify(data)
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
				const arg = parse_remote_arg(payload);

				data._ = await with_request_store(
					{ event: derive_event(event, { is_in_remote_form_or_command: true }), state },
					() => fn(arg)
				);

				break;
			}

			case 'prerender': {
				data._ = await with_request_store({ event, state }, () =>
					fn(parse_remote_arg(additional_args))
				);

				break;
			}

			case 'query': {
				const payload = /** @type {string} */ (
					// new URL(...) necessary because we're hiding the URL from the user in the event object
					new URL(event.request.url).searchParams.get('payload')
				);

				data._ = await with_request_store({ event, state }, () => fn(parse_remote_arg(payload)));

				break;
			}
		}

		await collect_remote_data(data, event, state);
		if (state.remote.ignored?.size) data.i = Array.from(state.remote.ignored);

		return Response.json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'result',
				data: stringify(data)
			}),
			{ headers }
		);
	} catch (error) {
		if (error instanceof Redirect) {
			const data = await collect_remote_data({ redirect: error.location }, event, state);

			return Response.json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					data: stringify(data)
				}),
				{ headers }
			);
		}

		const transformed = await handle_error_and_jsonify(event, state, error);

		return Response.json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'error',
				error: transformed
			}),
			{
				// By setting a non-200 during prerendering we fail the prerender process (unless handleHttpError handles it).
				// Errors at runtime will be passed to the client and are handled there
				status: state.prerendering ? transformed.status : undefined,
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
 */
export async function collect_remote_data(data, event, state) {
	/**
	 *
	 * @param {unknown} error
	 * @returns {Promise<App.Error>}
	 */
	function convert_error(error) {
		// TODO 4.0 remove the `Promise.resolve(...)`
		return Promise.resolve(handle_error_and_jsonify(event, state, error));
	}

	/** @type {Promise<any>[]} */
	const promises = [];

	// Keys the explicit pass has serialized. Invoking a query's `fn` there can, as a
	// side effect, register the same query in `state.remote.implicit` (via
	// `get_response`), so we skip those keys in the implicit pass below to avoid
	// processing them twice.
	/** @type {Set<string>} */
	const processed = new Set();

	if (state.remote.explicit) {
		const { explicit } = state.remote;

		/** @type {Promise<void>[]} */
		const inflight = [];

		const drain = () => {
			for (const [remote_key, { internals, fn }] of explicit) {
				explicit.delete(remote_key);
				if (processed.has(remote_key)) continue;
				processed.add(remote_key);

				// there were explicit refreshes/reconnects (via `refresh()`/`set()`/`reconnect()`),
				// so the client should apply these single-flight updates instead of calling `invalidateAll()`
				data.r = true;

				const type = /** @type {'p' | 'q' | 'l'} */ (
					internals.type === 'query_live' ? 'l' : internals.type[0]
				);

				// `fn` is deferred until now so the query runs after any state mutations
				// in the command/form body. If the query was re-awaited in the meantime,
				// `fn` returns the existing (fresh) cache entry rather than re-running.
				inflight.push(
					fn().then(
						(v) => {
							// a fresh value replaces the node entirely, so a re-run can't leave
							// a stale error from a previous run alongside the new value
							(data[type] ??= {})[remote_key] = { v };
							drain();
						},
						async (e) => {
							if (!(e instanceof Redirect)) {
								// (a Redirect is already handled elsewhere)
								(data[type] ??= {})[remote_key] = { e: await convert_error(e) };
							}
							drain();
						}
					)
				);
			}
		};

		drain();

		// `inflight` grows as settles drain newly-refreshed queries
		for (const promise of inflight) {
			await promise;
		}
	}

	if (state.remote.implicit) {
		for (const [internals, record] of state.remote.implicit) {
			// Private (non-exported) remote functions have no `id` and must never be
			// serialized into the response — otherwise their (potentially private) result
			// would be shipped to the client under a malformed `undefined/...` key.
			if (!internals.id) continue;

			for (const key in record) {
				// form outputs are registered under the client-side action id directly
				const remote_key = internals.type === 'form' ? key : create_remote_key(internals.id, key);

				// already serialized by the explicit pass (which always awaits and wins),
				// so don't reprocess it here with the implicit "still loading" heuristic
				if (processed.has(remote_key)) continue;

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
	/** @type {Map<string, Set<string>>} */
	const requested = new Map();

	for (const key of refreshes ?? []) {
		const parts = split_remote_key(key);

		const existing = requested.get(parts.id);

		if (existing) {
			existing.add(parts.payload);
		} else {
			requested.set(parts.id, new Set([parts.payload]));
		}
	}

	return requested;
}

/** @type {typeof handle_remote_form_post_internal} */
export async function handle_remote_form_post(event, state, id) {
	return record_span({
		name: 'sveltekit.remote.form.post',
		attributes: {
			'sveltekit.remote.form.post.id': id
		},
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () =>
				handle_remote_form_post_internal(traced_event, state, id)
			);
		}
	});
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {string} id
 * @returns {Promise<ServerActionResult>}
 */
async function handle_remote_form_post_internal(event, state, id) {
	const location = get_action_location(event.url);
	// `hash` and `name` can never contain a `/`, but the JSON-stringified key of a
	// keyed (`form.for(key)`) instance can — rejoin the remaining segments
	const [hash, name, ...rest] = id.split('/');
	const action_id = rest.join('/');
	const remotes = manifest.remotes;
	const module = Object.hasOwn(remotes, hash) ? await remotes[hash]() : undefined;

	let form = /** @type {RemoteForm<any, any>} */ (
		module && Object.hasOwn(module.default, name) ? module.default[name] : undefined
	);

	if (!form) {
		return method_not_allowed_result(event, location);
	}

	if (action_id) {
		// @ts-expect-error
		form = with_request_store({ event, state }, () => form.for(JSON.parse(action_id)));
	}

	try {
		const __ = /** @type {RemoteFormInternals} */ (/** @type {any} */ (form).__);

		const { data, meta, form_data } = await deserialize_binary_form(event.request, __.id);

		if (action_id && !('id' in data)) {
			data.id = JSON.parse(decodeURIComponent(action_id));
		}

		await with_request_store(
			{ event: derive_event(event, { is_in_remote_form_or_command: true }), state },
			() => __.fn(data, meta, form_data)
		);

		// We don't want the data to appear on `let { form } = $props()`, which is why we're not returning it.
		// It is instead available on `myForm.result`, setting of which happens within the remote `form` function.
		return {
			type: 'success',
			status: 200,
			location
		};
	} catch (e) {
		return action_error_result(e, location);
	}
}

/**
 * @param {URL} url
 */
export function has_remote_prefix(url) {
	return url.pathname.startsWith(`${base}/${app_dir}/remote/`);
}

/**
 * @param {URL} url
 */
export function strip_remote_prefix(url) {
	return url.pathname.replace(`${base}/${app_dir}/remote/`, '');
}

/**
 * @param {URL} url
 */
export function get_remote_id(url) {
	return has_remote_prefix(url) && strip_remote_prefix(url);
}

/**
 * @param {URL} url
 */
export function get_remote_action(url) {
	return url.searchParams.get('/remote');
}
