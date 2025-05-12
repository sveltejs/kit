import { text } from '../../../exports/index.js';
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

	/** @type {import('types').RemoteInfo} */
	const info = func.__;
	const transport = options.hooks.transport;

	event._.remote_invalidations = new Set();

	if (info.type === 'formAction') {
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
		return text(stringify_rpc_response(data, transport), {
			headers: {
				'x-sveltekit-rpc-invalidate': JSON.stringify([...event._.remote_invalidations])
			}
		});
	} else {
		const args_json =
			info.type === 'query' || info.type === 'cache'
				? /** @type {string} */ (event.url.searchParams.get('args'))
				: await event.request.text();
		const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
		const args = args_json ? devalue.parse(args_json, decoders) : [];
		const data = await with_event(event, () => func.apply(null, args));

		return text(stringify_rpc_response(data, transport), {
			headers: {
				'x-sveltekit-rpc-invalidate': JSON.stringify([...event._.remote_invalidations])
			}
		});
	}
}

/**
 * Try to `devalue.stringify` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {import('types').ServerHooks['transport']} transport
 */
export function stringify_rpc_response(data, transport) {
	const encoders = Object.fromEntries(
		Object.entries(transport).map(([key, value]) => [key, value.encode])
	);

	return devalue.stringify(data, encoders);
}
