import { isContentTypeTextual } from '../../core/adapter-utils.js';
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
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSREndpoint} route
 * @returns {Promise<import('types/hooks').ServerResponse>}
 */
export default async function render_route(request, route) {
	const mod = await route.load();

	/** @type {import('types/endpoint').RequestHandler} */
	const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (handler) {
		const match = route.pattern.exec(request.path);
		const params = route.params(match);

		const response = await handler({ ...request, params });
		const preface = `Invalid response from route ${request.path}`;

		if (response) {
			if (typeof response !== 'object') {
				return error(`${preface}: expected an object, got ${typeof response}`);
			}

			let { status = 200, body, headers = {} } = response;

			headers = lowercase_keys(headers);
			const type = headers['content-type'];

			const is_type_textual = isContentTypeTextual(type);

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
	}
}
