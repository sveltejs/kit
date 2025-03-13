import { negotiate } from '../../../utils/http.js';
import { json } from '../../../exports/index.js';
import { SvelteKitError } from '../../control.js';
import { handle_error_and_jsonify } from '../utils.js';
import * as devalue from 'devalue';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export function is_rpc_json_request(event) {
	const rpc_data = event.request.headers.get('x-sveltekit-remote');

	if (rpc_data == null) return false;
	const json = JSON.parse(rpc_data);
	if (!Array.isArray(json) || json.length !== 2) return false;

	const accept = negotiate(event.request.headers.get('accept') ?? '*/*', ['application/json']);

	return accept === 'application/json' && event.request.method === 'POST';
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import("types").SSROptions} options
 */
async function bad_rpc(event, options) {
	const bad_rpc = new SvelteKitError(
		405,
		'Method Not Allowed',
		'POST method not allowed for this remote procedure call'
	);

	return json(
		{
			type: 'error',
			error: await handle_error_and_jsonify(event, options, bad_rpc)
		},
		{
			status: bad_rpc.status,
			headers: {
				// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
				// "The server must generate an Allow header field in a 405 status code response"
				allow: 'GET'
			}
		}
	);
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 */
export async function handle_rpc_json_request(event, options, manifest) {
	const [hash, func_name] = JSON.parse(
		/** @type {string} */ (event.request.headers.get('x-sveltekit-remote'))
	);
	const remotes = manifest._.remotes;

	if (!remotes[hash]) {
		// TODO replace with `error`
		return await bad_rpc(event, options);
	}

	let func;

	try {
		const module = await remotes[hash]();
		func = module[func_name];
	} catch {
		// TODO replace with `error`
		return await bad_rpc(event, options);
	}

	const transport = options.hooks.transport;
	const args_json = await event.request.text();
	const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
	const args = devalue.parse(args_json, decoders);
	let data;

	try {
		data = await func.apply(null, args);
	} catch (/** @type {any} */ e) {
		return json({
			type: 'error',
			status: 500,
			error: await handle_error_and_jsonify(event, options, e)
		});
	}

	return json({
		type: 'success',
		status: data ? 200 : 204,
		data: stringify_rpc_response(data, transport)
	});
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
