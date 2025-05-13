/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { PrerenderOptions, RemoteInfo, ServerHooks, SSROptions, SSRState } from 'types' */

import { text } from '../../../exports/index.js';
import * as devalue from 'devalue';
import { app_dir } from '__sveltekit/paths';
import { error } from 'console';
import { with_event } from '../../app/server/event.js';
import { is_form_content_type } from '../../../utils/http.js';
import { SvelteKitError } from '../../control.js';
import { stringify } from '../../shared.js';

/**
 * @param {RequestEvent} event
 * @param {SSROptions} options
 * @param {SSRManifest} manifest
 * @param {string} [id]
 */
export async function handle_remote_call(
	event,
	options,
	manifest,
	id = event.url.pathname.replace(`/${app_dir}/remote/`, '')
) {
	const [hash, func_name] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const func = module[func_name];

	if (!func) error(404);

	/** @type {RemoteInfo} */
	const info = func.__;
	const transport = options.hooks.transport;

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
		const data = await with_event(event, () => func(form_data)); // TODO func.apply(null, form_data) doesn't work for unknown reasons
		return text(stringify(data, transport));
	} else {
		const args_json =
			info.type === 'query' || info.type === 'cache'
				? /** @type {string} */ (event.url.searchParams.get('args'))
				: await event.request.text();
		const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
		const args = args_json ? devalue.parse(args_json, decoders) : [];
		const data = await with_event(event, () => func.apply(null, args));

		return text(stringify(data, transport));
	}
}

/**
 * @typedef {{
 * 	remote_results: Record<string, unknown>;
 * 	remote_prerendering: PrerenderOptions | undefined
 *  transport: ServerHooks['transport'];
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
			remote_results: {},
			remote_prerendering: state.prerendering,
			transport: options.hooks.transport
			// remote_invalidations: new Set() // <- this is how we could do refresh on the server
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
