/** @import { ActionResult, RemoteForm, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse, RemoteInfo, RequestState, SSROptions } from 'types' */

import { json, error } from '@sveltejs/kit';
import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing } from '@sveltejs/kit/internal/server';
import { app_dir, base } from '__sveltekit/paths';
import { is_form_content_type } from '../../utils/http.js';
import { parse_remote_arg, stringify } from '../shared.js';
import { handle_error_and_jsonify } from './utils.js';
import { normalize_error } from '../../utils/error.js';
import { check_incorrect_fail_use } from './page/actions.js';
import { DEV } from 'esm-env';
import { record_span } from '../telemetry/record_span.js';

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
	const [hash, name, prerender_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const fn = module[name];

	if (!fn) error(404);

	/** @type {RemoteInfo} */
	const info = fn.__;
	const transport = options.hooks.transport;

	event.tracing.current.setAttributes({
		'sveltekit.remote.call.type': info.type,
		'sveltekit.remote.call.name': info.name
	});

	/** @type {string[] | undefined} */
	let form_client_refreshes;

	try {
		if (info.type === 'form') {
			if (!is_form_content_type(event.request)) {
				throw new SvelteKitError(
					415,
					'Unsupported Media Type',
					`Form actions expect form-encoded data — received ${event.request.headers.get(
						'content-type'
					)}`
				);
			}

			const form_data = await event.request.formData();
			form_client_refreshes = JSON.parse(
				/** @type {string} */ (form_data.get('sveltekit:remote_refreshes')) ?? '[]'
			);
			form_data.delete('sveltekit:remote_refreshes');

			const fn = info.fn;
			const data = await with_request_store({ event, state }, () => fn(form_data));

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport),
					refreshes: await serialize_refreshes(/** @type {string[]} */ (form_client_refreshes))
				})
			);
		}

		if (info.type === 'command') {
			/** @type {{ payload: string, refreshes: string[] }} */
			const { payload, refreshes } = await event.request.json();
			const arg = parse_remote_arg(payload, transport);
			const data = await with_request_store({ event, state }, () => fn(arg));

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport),
					refreshes: await serialize_refreshes(refreshes)
				})
			);
		}

		const payload =
			info.type === 'prerender'
				? prerender_args
				: /** @type {string} */ (
						// new URL(...) necessary because we're hiding the URL from the user in the event object
						new URL(event.request.url).searchParams.get('payload')
					);

		const data = await with_request_store({ event, state }, () =>
			fn(parse_remote_arg(payload, transport))
		);

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'result',
				result: stringify(data, transport)
			})
		);
	} catch (error) {
		if (error instanceof Redirect) {
			return json({
				type: 'redirect',
				location: error.location,
				refreshes: await serialize_refreshes(form_client_refreshes ?? [])
			});
		}

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'error',
				error: await handle_error_and_jsonify(event, state, options, error),
				status: error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500
			}),
			{
				headers: {
					'cache-control': 'private, no-store'
				}
			}
		);
	}

	/**
	 * @param {string[]} client_refreshes
	 */
	async function serialize_refreshes(client_refreshes) {
		const refreshes = {
			...state.refreshes,
			...Object.fromEntries(
				await Promise.all(
					client_refreshes.map(async (key) => {
						const [hash, name, payload] = key.split('/');
						const loader = manifest._.remotes[hash];

						// TODO what do we do in this case? erroring after the mutation has happened is not great
						if (!loader) error(400, 'Bad Request');

						const module = await loader();
						const fn = module[name];

						if (!fn) error(400, 'Bad Request');

						return [
							key,
							await with_request_store({ event, state }, () =>
								fn(parse_remote_arg(payload, transport))
							)
						];
					})
				)
			)
		};

		return Object.keys(refreshes).length > 0 ? stringify(refreshes, transport) : undefined;
	}
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

	let form = /** @type {RemoteForm<any>} */ (module?.[name]);

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
		const form_data = await event.request.formData();
		const fn = /** @type {RemoteInfo & { type: 'form' }} */ (/** @type {any} */ (form).__).fn;

		await with_request_store({ event, state }, () => fn(form_data));

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
