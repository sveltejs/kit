/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteForm } from '$app/server' */
/** @import { ActionResult } from '$app/forms' */
/** @import { RemoteFormInternals, RemoteFunctionData, RemoteFunctionResponse, RemoteInternals, RemoteQueryLiveInternals, RequestState, SSROptions } from 'types' */

import { error } from '@sveltejs/kit';
import { Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing, record_span } from '@sveltejs/kit/internal/server';
import { app_dir, base } from '#app/paths';
import { is_form_content_type } from '../../utils/http.js';
import { create_remote_key, parse_remote_arg, split_remote_key } from '../shared.js';
import { stringify } from '#app/internal/transport';
import { handle_error_and_jsonify } from './errors.js';
import { normalize_error } from '../../utils/error.js';
import { check_incorrect_fail_use, get_action_location } from './page/actions.js';
import { DEV } from 'esm-env';
import { deserialize_binary_form } from '../form-utils.js';
import { stream_from_iterator, with_version_header } from './utils.js';

/**
 * How long (in milliseconds) to wait after the last message was sent before
 * sending a `: keep-alive` SSE comment, to prevent proxies/load balancers with
 * an idle timeout from closing an otherwise-quiet `query.live` connection.
 */
const KEEP_ALIVE_INTERVAL = 30_000;

/** @type {typeof handle_remote_call_internal} */
export async function handle_remote_call(event, state, options, manifest, id) {
	return record_span({
		name: 'sveltekit.remote.call',
		attributes: {
			'sveltekit.remote.call.id': id
		},
		fn: async (current) => {
			const traced_event = merge_tracing(event, current);
			const response = await with_request_store({ event: traced_event, state }, () =>
				handle_remote_call_internal(traced_event, state, options, manifest, id)
			);
			return with_version_header(response);
		}
	});
}

/**
 * Looks a remote function up in the manifest by its request id.
 * @param {SSRManifest} manifest
 * @param {string} id
 */
async function resolve_remote_function(manifest, id) {
	const [hash, name, additional_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!Object.hasOwn(remotes, hash)) error(404);

	const module = await remotes[hash]();
	const fn = Object.hasOwn(module.default, name) ? module.default[name] : undefined;

	if (!fn) error(404);

	return { fn, internals: /** @type {RemoteInternals} */ (fn.__), additional_args };
}

/**
 * @param {RemoteFunctionData} data
 * @param {HeadersInit | undefined} headers
 */
function result_response(data, headers) {
	return Response.json(
		/** @type {RemoteFunctionResponse} */ ({
			type: 'result',
			data: stringify(data)
		}),
		{ headers }
	);
}

/**
 * Handles a `query.live` call: runs the generator and streams its values as
 * server-sent events.
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {RemoteQueryLiveInternals} internals
 */
function handle_live_query(event, state, options, internals) {
	if (event.request.method !== 'GET') {
		throw new SvelteKitError(
			405,
			'Method Not Allowed',
			`\`query.live\` functions must be invoked via GET request, not ${event.request.method}`
		);
	}

	const payload = /** @type {string} */ (new URL(event.request.url).searchParams.get('payload'));

	// aborted whenever the stream is torn down, so unlike the request signal it
	// also fires on response teardown, which the generator could otherwise
	// never observe
	const cancellation = new AbortController();

	const live_event = {
		...event,
		request: new Request(event.request, {
			signal: AbortSignal.any([event.request.signal, cancellation.signal])
		})
	};

	const generator = internals.run(live_event, state, parse_remote_arg(payload));

	/** @param {any} payload */
	const frame = (payload) => 'data: ' + JSON.stringify(payload) + '\n\n';

	/** @type {string | undefined} */
	let result;

	// everything the stream sends, as a generator of SSE strings — it holds no
	// reference to the stream controller, so it cannot touch a dead one
	async function* frames() {
		/** @type {Promise<IteratorResult<any>> | null} */
		let pending = null;
		let settled = false;
		/** @type {() => void} */
		let wake = () => {};
		const settle = () => {
			settled = true;
			wake();
		};

		try {
			while (true) {
				if (!pending) {
					settled = false;
					// one reaction per next() call, so an idle stream doesn't
					// accumulate one per keep-alive tick
					pending = generator.next();
					pending.then(settle, settle);
				}

				if (!settled) {
					await new Promise((resolve) => {
						const timer = setTimeout(resolve, KEEP_ALIVE_INTERVAL);
						wake = () => {
							clearTimeout(timer);
							resolve(undefined);
						};
					});
				}

				if (!settled) {
					// SSE comments (lines starting with `:`) are ignored by the client
					yield ': keep-alive\n\n';
					continue;
				}

				const winner = await pending;
				pending = null;

				if (winner.done) return;

				// only send changed data
				if (result !== (result = stringify(winner.value))) {
					yield frame({ type: 'result', result });
				}
			}
		} catch (error) {
			if (!live_event.request.signal.aborted) {
				if (error instanceof Redirect) {
					yield frame({ type: 'redirect', location: error.location });
				} else {
					yield frame({
						type: 'error',
						error: await handle_error_and_jsonify(event, state, options, error)
					});
				}
			}
		} finally {
			cancellation.abort();
			await generator.return(undefined);
		}
	}

	return new Response(
		stream_from_iterator(frames(), () => cancellation.abort()),
		{
			headers: {
				'cache-control': 'private, no-store',
				'content-type': 'text/event-stream'
			}
		}
	);
}
/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} id
 */
async function handle_remote_call_internal(event, state, options, manifest, id) {
	const { fn, internals, additional_args } = await resolve_remote_function(manifest, id);

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
			case 'query_live':
				return handle_live_query(event, state, options, internals);

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
					{ event, state: { ...state, is_in_remote_form_or_command: true } },
					() => fn(input, meta, form_data)
				);

				if (data._.issues) {
					// special case — don't serialize refreshes/reconnects
					return result_response(data, headers);
				}

				break;
			}

			case 'command': {
				/** @type {{ payload: string, refreshes?: string[] }} */
				const { payload, refreshes } = await event.request.json();
				state.remote.requested = create_requested_map(refreshes);
				const arg = parse_remote_arg(payload);

				data._ = await with_request_store(
					{ event, state: { ...state, is_in_remote_form_or_command: true } },
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

		await collect_remote_data(data, event, state, options);

		return result_response(data, headers);
	} catch (error) {
		if (error instanceof Redirect) {
			const data = await collect_remote_data({ redirect: error.location }, event, state, options);

			return result_response(data, headers);
		}

		const transformed = await handle_error_and_jsonify(event, state, options, error);

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
 * @param {SSROptions} options
 */
export async function collect_remote_data(data, event, state, options) {
	/**
	 *
	 * @param {unknown} error
	 * @returns {Promise<App.Error>}
	 */
	function convert_error(error) {
		// TODO 4.0 remove the `Promise.resolve(...)`
		return Promise.resolve(handle_error_and_jsonify(event, state, options, error));
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
	const location = get_action_location(event.url);
	// `hash` and `name` can never contain a `/`, but the JSON-stringified key of a
	// keyed (`form.for(key)`) instance can — rejoin the remaining segments
	const [hash, name, ...rest] = id.split('/');
	const action_id = rest.join('/');
	const remotes = manifest._.remotes;
	const module = Object.hasOwn(remotes, hash) ? await remotes[hash]() : undefined;

	let form = /** @type {RemoteForm<any, any>} */ (
		module && Object.hasOwn(module.default, name) ? module.default[name] : undefined
	);

	if (!form) {
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: 'GET'
		});
		return {
			type: 'error',
			location,
			// We're lying a bit with the types here; this will be transformed into a proper App.Error object later
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
		const __ = /** @type {RemoteFormInternals} */ (/** @type {any} */ (form).__);

		const { data, meta, form_data } = await deserialize_binary_form(event.request, __.id);

		if (action_id && !('id' in data)) {
			data.id = JSON.parse(decodeURIComponent(action_id));
		}

		await with_request_store(
			{ event, state: { ...state, is_in_remote_form_or_command: true } },
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
			location,
			// @ts-expect-error We're lying a bit with the types here; this will be transformed into a proper App.Error object later
			error: check_incorrect_fail_use(err)
		};
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
