import * as devalue from 'devalue';
import { public_env } from '../shared-server.js'; // TODO get rid
import { explicit_public_env } from '__sveltekit/env';

/** @type {string} */
let body;

/** @type {string} */
let etag;

/** @type {Headers} */
let headers;

/**
 * @param {Request} request
 * @returns {Response}
 */
export function get_public_env(request) {
	const env = explicit_public_env;

	body ??= `export const env=${devalue.uneval(env)}`;
	etag ??= `W/${Date.now()}`;
	headers ??= new Headers({
		'content-type': 'application/javascript; charset=utf-8',
		etag
	});

	if (request.headers.get('if-none-match') === etag) {
		return new Response(undefined, { status: 304, headers });
	}

	return new Response(body, { headers });
}
