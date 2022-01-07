import { get_single_valued_header } from '../../utils/http.js';
import { decode_params, lowercase_keys } from './utils.js';

/** @param {string} body */
function error(body) {
	return {
		status: 500,
		body,
		headers: {}
	};
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
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSREndpoint} route
 * @param {RegExpExecArray} match
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
export async function render_endpoint(request, route, match) {
	const mod = await route.load();

	/** @type {import('types/endpoint').RequestHandler} */
	const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (!handler) {
		return;
	}

	// we're mutating `request` so that we don't have to do { ...request, params }
	// on the next line, since that breaks the getters that replace path, query and
	// origin. We could revert that once we remove the getters
	request.params = route.params ? decode_params(route.params(match)) : {};

	const response = await handler(request);
	const preface = `Invalid response from route ${request.url.pathname}`;

	if (!response) {
		return;
	}
	if (typeof response !== 'object') {
		return error(`${preface}: expected an object, got ${typeof response}`);
	}

	let { status = 200, body, headers = {} } = response;

	headers = lowercase_keys(headers);
	const type = get_single_valued_header(headers, 'content-type');

	if (!is_text(type) && !(body instanceof Uint8Array || is_string(body))) {
		return error(
			`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`
		);
	}

	/** @type {import('types/hooks').StrictBody} */
	let normalized_body;

	// ensure the body is an object
	if (
		(typeof body === 'object' || typeof body === 'undefined') &&
		!(body instanceof Uint8Array) &&
		(!type || type.startsWith('application/json'))
	) {
		headers = { ...headers, 'content-type': 'application/json; charset=utf-8' };
		normalized_body = JSON.stringify(typeof body === 'undefined' ? {} : body);
	} else {
		normalized_body = /** @type {import('types/hooks').StrictBody} */ (body);
	}

	return { status, body: normalized_body, headers };
}
