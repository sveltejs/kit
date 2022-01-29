import { to_headers } from '../../utils/http.js';
import { hash } from '../hash.js';
import { decode_params } from './utils.js';

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
 * @param {import('types/hooks').RequestEvent} event
 * @param {import('types/internal').SSREndpoint} route
 * @param {RegExpExecArray} match
 * @returns {Promise<Response | undefined>}
 */
export async function render_endpoint(event, route, match) {
	const mod = await route.load();

	/** @type {import('types/endpoint').RequestHandler} */
	const handler = mod[event.request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (!handler) {
		return;
	}

	// we're mutating `request` so that we don't have to do { ...request, params }
	// on the next line, since that breaks the getters that replace path, query and
	// origin. We could revert that once we remove the getters
	event.params = route.params ? decode_params(route.params(match)) : {};

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
		response.headers instanceof Headers ? response.headers : to_headers(response.headers);

	const type = headers.get('content-type');

	if (!is_text(type) && !(body instanceof Uint8Array || is_string(body))) {
		return error(
			`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`
		);
	}

	/** @type {import('types/hooks').StrictBody} */
	let normalized_body;

	if (is_pojo(body) && (!type || type.startsWith('application/json'))) {
		headers.set('content-type', 'application/json; charset=utf-8');
		normalized_body = JSON.stringify(body);
	} else {
		normalized_body = /** @type {import('types/hooks').StrictBody} */ (body);
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

	return new Response(normalized_body, {
		status,
		headers
	});
}

/** @param {any} body */
function is_pojo(body) {
	if (typeof body !== 'object') return false;

	if (body) {
		if (body instanceof Uint8Array) return false;

		// body could be a node Readable, but we don't want to import
		// node built-ins, so we use duck typing
		if (body._readableState && body._writableState && body._events) return false;

		// similarly, it could be a web ReadableStream
		if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return false;
	}

	return true;
}
