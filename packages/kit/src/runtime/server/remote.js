/** @import { ActionResult, RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { PrerenderOptions, RemoteFunctionResponse, RemoteInfo, ServerHooks, SSROptions, SSRState } from 'types' */

import { json, error } from '@sveltejs/kit';
import { ActionFailure, HttpError, Redirect, SvelteKitError } from '@sveltejs/kit/internal';
import { app_dir, base } from '__sveltekit/paths';
import { with_event } from '../app/server/event.js';
import { is_form_content_type } from '../../utils/http.js';
import { parse_remote_args as parse_remote_arg, stringify } from '../shared.js';
import { handle_error_and_jsonify } from './utils.js';
import { normalize_error } from '../../utils/error.js';
import { check_incorrect_fail_use } from './page/actions.js';
import { DEV } from 'esm-env';

/**
 * @param {RequestEvent} event
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} id
 */
export async function handle_remote_call(event, options, manifest, id) {
	const [hash, func_name, prerender_args] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const func = module[func_name];

	if (!func) error(404);

	/** @type {RemoteInfo} */
	const info = func.__;
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
			const data = await with_event(event, () => func.call(null, form_data));

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data instanceof ActionFailure ? data.data : data, transport),
					refreshes: stringify(
						{
							...get_remote_info(event).refreshes,
							...(await apply_client_refreshes(/** @type {string[]} */ (form_client_refreshes)))
						},
						transport
					)
				})
			);
		} else if (info.type === 'command') {
			/** @type {{ args: string, refreshes: string[] }} */
			const { args: stringified_arg, refreshes } = await event.request.json();
			const arg = parse_remote_arg(stringified_arg, transport);
			const data = await with_event(event, () => func.call(null, arg));
			const refreshed = await apply_client_refreshes(refreshes);

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport),
					refreshes: stringify({ ...get_remote_info(event).refreshes, ...refreshed }, transport)
				})
			);
		} else {
			const stringified_arg =
				info.type === 'prerender'
					? prerender_args
					: info.type === 'query'
						? /** @type {string} */ (
								// new URL(...) necessary because we're hiding the URL from the user in the event object
								new URL(event.request.url).searchParams.get('args')
							)
						: await event.request.text();
			const data = await with_event(event, () =>
				func.call(null, parse_remote_arg(stringified_arg, transport))
			);

			return json(
				/** @type {RemoteFunctionResponse} */ ({
					type: 'result',
					result: stringify(data, transport)
				})
			);
		}
	} catch (error) {
		if (error instanceof Redirect) {
			const refreshes = {
				...(get_remote_info(event).refreshes || {}), // could be set by form actions
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
					const [id, stringified_args] = key.split('|');
					const [hash, func_name] = id.split('/');
					const remotes = manifest._.remotes;

					// TODO what do we do in this case? erroring after the mutation has happened is not great
					if (!remotes[hash]) error(400, 'Bad request');

					const module = await remotes[hash]();
					const func = module[func_name];

					if (!func) error(400, 'Bad request');

					return [
						key,
						await with_event(event, () =>
							func.apply(null, parse_remote_arg(stringified_args, transport))
						)
					];
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
	const [hash, func_name, action_id] = id.split('/');
	const remotes = manifest._.remotes;
	const module = await remotes[hash]?.();
	let func = module?.[func_name];

	if (!func) {
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
		func = with_event(event, () => func.for(JSON.parse(action_id)));
	}

	try {
		const form_data = await event.request.formData();
		get_remote_info(event);
		const data = await with_event(event, () => func.call(null, form_data));

		// We don't want the data to appear on `let { form } = $props()`, which is why we're not returning it
		if (data instanceof ActionFailure) {
			return {
				type: 'failure',
				status: data.status
			};
		} else {
			return {
				type: 'success',
				status: 200
			};
		}
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

/**
 * @typedef {{
 * 	results: Record<string, Promise<any>>;
 * 	unevaled_results: Record<string, Promise<string>>;
 *  form_result?: [key: any, value: any];
 * 	prerendering: PrerenderOptions | undefined
 *  transport: ServerHooks['transport'];
 *  handleValidationError: ServerHooks['handleValidationError'];
 *  form_instances: Map<any, any>;
 *  refreshes?: Record<string, any>;
 * }} RemoteEventInfo
 */

const remote_info = Symbol('remote');

/**
 * Adds the remote info on a hidden property of the event object
 * @param {RequestEvent} event
 * @param {SSRState} state
 * @param {SSROptions} options
 */
export function add_remote_info(event, state, options) {
	Object.defineProperty(event, remote_info, {
		value: /** @type {RemoteEventInfo} */ ({
			results: {},
			unevaled_results: {},
			form_result: undefined,
			prerendering: state.prerendering,
			transport: options.hooks.transport,
			handleValidationError: options.hooks.handleValidationError,
			form_instances: new Map()
		}),
		configurable: false,
		writable: false,
		enumerable: false
	});
}

/**
 * Gets the remote info on a hidden property of the event object
 * @template {boolean | undefined} [Optional=false]
 * @param {RequestEvent} event
 * @param {Optional} [optional]
 * @returns {Optional extends true ? RemoteEventInfo | undefined : RemoteEventInfo}
 */
export function get_remote_info(event, optional) {
	if (!(remote_info in event)) {
		// @ts-expect-error TS is not smart enough for this
		if (optional) return undefined;
		throw new Error('get_remote_info called without add_remote_info');
	}

	// @ts-expect-error TS is not smart enough for this
	return /** @type {RemoteEventInfo} */ (event[remote_info]);
}
