import * as devalue from 'devalue';
import { public_env } from '../shared-server.js';
import { explicit_public_env } from '__sveltekit/env';

/** @type {string} */
let payload;

/** @type {string} */
let etag;

/** @type {Headers} */
let headers;

/**
 * @param {Request} request
 * @returns {Response}
 */
export function get_public_env(request) {
	const script = request.url.endsWith('.script.js');

	const env = __SVELTEKIT_EXPERIMENTAL_EXPLICIT_ENVIRONMENT_VARIABLES__
		? explicit_public_env // TODO can we strip out static vars?
		: public_env;

	payload ??= devalue.uneval(env);
	etag ??= `W/${Date.now()}`;
	headers ??= new Headers({
		'content-type': 'application/javascript; charset=utf-8',
		etag
	});

	if (request.headers.get('if-none-match') === etag) {
		return new Response(undefined, { status: 304, headers });
	}

	if (script) {
		return new Response(`globalThis.__sveltekit_sw={env:${payload}}`, { headers });
	}

	return new Response(`export const env=${payload}`, { headers });
}
