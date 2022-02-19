import { to_headers } from '../../utils/http.js';
import { hash } from '../hash.js';
import { is_pojo, normalize_request_method } from './utils.js';

/** @param {string} body */
function error(body) {
	return new Response(body, {
		status: 500
	});
}

/** @param {unknown} s */
function is_string(s) {
	return typeof s === 'string' || s instanceof String;
}

const text_types = new Set([
	'application/xml',
	'application/json',
	'application/x-www-form-urlencoded',
	'multipart/form-data'
]);

/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * @param {string | undefined | null} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
export function is_text(content_type) {
	if (!content_type) return true; // defaults to json
	const type = content_type.split(';')[0].toLowerCase(); // get the mime type

	return type.startsWith('text/') || type.endsWith('+xml') || text_types.has(type);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {{ [method: string]: import('types').RequestHandler }} mod
 * @returns {Promise<Response | undefined>}
 */
export async function render_endpoint(event, mod) {
	const method = normalize_request_method(event);

	/** @type {import('types').RequestHandler} */
	let handler = mod[method];

	if (!handler && method === 'head') {
		handler = mod.get;
	}
	if (!handler) {
		return;
	}

	const response = await handler(event);
	const preface = `Invalid response from route ${event.url.pathname}`;

	if (typeof response !== 'object') {
		return error(`${preface}: expected an object, got ${typeof response}`);
	}

	if (response.fallthrough) {
		return;
	}

	const { status = 200, body = {} } = response;
	const headers =
		response.headers instanceof Headers
			? new Headers(response.headers)
			: to_headers(response.headers);

	const type = headers.get('content-type');

	if (!is_text(type) && !(body instanceof Uint8Array || is_string(body))) {
		return error(
			`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`
		);
	}

	/** @type {import('types').StrictBody} */
	let normalized_body;

	if (is_pojo(body) && (!type || type.startsWith('application/json'))) {
		headers.set('content-type', 'application/json; charset=utf-8');
		normalized_body = JSON.stringify(body);
	} else {
		normalized_body = /** @type {import('types').StrictBody} */ (body);
	}

	if (
		(typeof normalized_body === 'string' || normalized_body instanceof Uint8Array) &&
		!headers.has('etag')
	) {
		const cache_control = headers.get('cache-control');
		if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
			headers.set('etag', `"${hash(normalized_body)}"`);
		}
	}

	return new Response(method !== 'head' ? normalized_body : undefined, {
		status,
		headers
	});
}
