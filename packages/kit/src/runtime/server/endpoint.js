import { get_single_valued_header } from '../../utils/http.js';
import { lowercase_keys } from './utils.js';

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

/**
 * Decides how the body should be parsed based on its mime type. Should match what's in parse_body
 *
 * @param {string | undefined | null} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
function is_content_type_textual(content_type) {
	if (!content_type) return true; // defaults to json
	const [type] = content_type.split(';'); // get the mime type
	return (
		type === 'text/plain' ||
		type === 'application/json' ||
		type === 'application/x-www-form-urlencoded' ||
		type === 'multipart/form-data'
	);
}

/**
 * @param {import('types/hooks').Request} request
 * @param {import('types/internal').SSREndpoint} route
 * @param {RegExpExecArray} match
 * @returns {Promise<import('types/hooks').Response | undefined>}
 */
export async function render_endpoint(request, route, match) {
	const mod = await route.load();

	/** @type {import('types/endpoint').RequestHandler} */
	const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (!handler) {
		return;
	}

	const params = route.params(match);

	const response = await handler({ ...request, params });
	const preface = `Invalid response from route ${request.path}`;

	if (!response) {
		return;
	}
	if (typeof response !== 'object') {
		return error(`${preface}: expected an object, got ${typeof response}`);
	}

	let { status = 200, body, headers = {} } = response;

	headers = lowercase_keys(headers);
	const type = get_single_valued_header(headers, 'content-type');

	const is_type_textual = is_content_type_textual(type);

	if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
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
