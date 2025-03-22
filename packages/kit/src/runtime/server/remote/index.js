import { json } from '../../../exports/index.js';
import * as devalue from 'devalue';
import { app_dir } from '__sveltekit/paths';
import { error } from 'console';
import { with_event } from '../../app/server/event.js';
import { is_form_content_type } from '../../../utils/http.js';
import { SvelteKitError } from '../../control.js';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 */
export async function handle_remote_call(event, options, manifest) {
	const id = event.url.pathname.replace(`/${app_dir}/remote/`, '');

	const [hash, func_name] = id.split('/');
	const remotes = manifest._.remotes;

	if (!remotes[hash]) error(404);

	const module = await remotes[hash]();
	const func = module[func_name];

	if (!func) error(404);

	const transport = options.hooks.transport;

	if (func.__type === 'formAction') {
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
		const data = await with_event(event, () => func.apply(null, form_data));
		// TODO what should happen with the result? how to incorporate it into the page?
		throw new Error('Form actions are not yet supported');
	} else {
		const args_json =
			func.__type === 'query'
				? /** @type {string} */ (event.url.searchParams.get('args'))
				: await event.request.text();
		const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
		const args = devalue.parse(args_json, decoders);
		const data = await with_event(event, () => func.apply(null, args));

		return json(stringify_rpc_response(data, transport));
	}
}

/**
 * Try to `devalue.stringify` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {import('types').ServerHooks['transport']} transport
 */
function stringify_rpc_response(data, transport) {
	const encoders = Object.fromEntries(
		Object.entries(transport).map(([key, value]) => [key, value.encode])
	);

	return devalue.stringify(data, encoders);
}
