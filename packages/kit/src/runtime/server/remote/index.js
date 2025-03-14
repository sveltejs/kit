import { json } from '../../../exports/index.js';
import * as devalue from 'devalue';
import { app_dir } from '__sveltekit/paths';
import { error } from 'console';

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
	const args_json = await event.request.text();
	const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
	const args = devalue.parse(args_json, decoders);
	const data = await func.apply(null, args);

	return json(stringify_rpc_response(data, transport));
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
