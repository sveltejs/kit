/** @import { ActionResult, RemoteForm, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse, RemoteInfo, SSROptions } from 'types' */

import { json, error } from '@sveltejs/kit';
import { HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { app_dir, base } from '__sveltekit/paths';
import { with_event } from '../app/server/event.js';
import { is_form_content_type } from '../../utils/http.js';
import { parse_remote_arg, stringify } from '../shared.js';
import { handle_error_and_jsonify } from './utils.js';
import { normalize_error } from '../../utils/error.js';
import { check_incorrect_fail_use } from './page/actions.js';
import { DEV } from 'esm-env';
import { get_event_state } from './event-state.js';

/**
 * @param {RequestEvent} event
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} id
 */
export async function handle_remote_call(event, options, manifest, id) {
	const [hash, name, prerender_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const fn = module[name];

	if (!fn) error(404);

	/** @type {RemoteInfo} */
	const info = fn.__;
	const transport = options.hooks.transport;

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
			const data = await with_event(event, () => fn(form_data));

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport),
					refreshes: stringify(
						{
							...get_event_state(event).refreshes,
							...(await apply_client_refreshes(/** @type {string[]} */ (form_client_refreshes)))
						},
						transport
					)
				})
			);
		}

		if (info.type === 'command') {
			/** @type {{ payload: string, refreshes: string[] }} */
			const { payload, refreshes } = await event.request.json();
			const arg = parse_remote_arg(payload, transport);
			const data = await with_event(event, () => fn(arg));
			const refreshed = await apply_client_refreshes(refreshes);

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport),
					refreshes: stringify({ ...get_event_state(event).refreshes, ...refreshed }, transport)
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

		const data = await with_event(event, () => fn(parse_remote_arg(payload, transport)));

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'result',
				result: stringify(data, transport)
			})
		);
	} catch (error) {
		if (error instanceof Redirect) {
			const refreshes = {
				...(get_event_state(event).refreshes ?? {}), // could be set by form actions
				...(await apply_client_refreshes(form_client_refreshes ?? []))
			};
			return json({
				type: 'redirect',
				location: error.location,
				refreshes: Object.keys(refreshes).length > 0 ? stringify(refreshes, transport) : undefined
			});
		}

		return json(
			/** @type {RemoteFunctionResponse} */ ({
				type: 'error',
				error: await handle_error_and_jsonify(event, options, error),
				status: error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500
			}),
			{
				headers: {
					'cache-control': 'private, no-store'
				}
			}
		);
	}

	/** @param {string[]} refreshes */
	async function apply_client_refreshes(refreshes) {
		return Object.fromEntries(
			await Promise.all(
				refreshes.map(async (key) => {
					const [hash, name, payload] = key.split('/');
					const loader = manifest._.remotes[hash];

					// TODO what do we do in this case? erroring after the mutation has happened is not great
					if (!loader) error(400, 'Bad Request');

					const module = await loader();
					const fn = module[name];

					if (!fn) error(400, 'Bad Request');

					return [key, await with_event(event, () => fn(parse_remote_arg(payload, transport)))];
				})
			)
		);
	}
}

/**
 * @param {RequestEvent} event
 * @param {SSRManifest} manifest
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function handle_remote_form_post(event, manifest, id) {
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
		form = with_event(event, () => form.for(JSON.parse(action_id)));
	}

	try {
		const form_data = await event.request.formData();
		const fn = /** @type {RemoteInfo & { type: 'form' }} */ (/** @type {any} */ (form).__).fn;

		await with_event(event, () => fn(form_data));

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
