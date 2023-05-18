import { HttpError, Redirect, ActionFailure } from '../runtime/control.js';
import { BROWSER, DEV } from 'esm-env';
import { get_route_segments } from '../utils/routing.js';

// For some reason we need to type the params as well here,
// JSdoc doesn't seem to like @type with function overloads
/**
 * @type {import('@sveltejs/kit').error}
 * @param {number} status
 * @param {any} message
 */
export function error(status, message) {
	if ((!BROWSER || DEV) && (isNaN(status) || status < 400 || status > 599)) {
		throw new Error(`HTTP error status codes must be between 400 and 599 — ${status} is invalid`);
	}

	return new HttpError(status, message);
}

/** @type {import('@sveltejs/kit').redirect} */
export function redirect(status, location) {
	if ((!BROWSER || DEV) && (isNaN(status) || status < 300 || status > 308)) {
		throw new Error('Invalid status code');
	}

	return new Redirect(status, location);
}

/** @type {import('@sveltejs/kit').json} */
export function json(data, init) {
	// TODO deprecate this in favour of `Response.json` when it's
	// more widely supported
	const body = JSON.stringify(data);

	// we can't just do `text(JSON.stringify(data), init)` because
	// it will set a default `content-type` header. duplicated code
	// means less duplicated work
	const headers = new Headers(init?.headers);
	if (!headers.has('content-length')) {
		headers.set('content-length', encoder.encode(body).byteLength.toString());
	}

	if (!headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	return new Response(body, {
		...init,
		headers
	});
}

const encoder = new TextEncoder();

/** @type {import('@sveltejs/kit').text} */
export function text(body, init) {
	const headers = new Headers(init?.headers);
	if (!headers.has('content-length')) {
		headers.set('content-length', encoder.encode(body).byteLength.toString());
	}

	return new Response(body, {
		...init,
		headers
	});
}

/**
 * Generates an `ActionFailure` object.
 * @param {number} status
 * @param {Record<string, any> | undefined} [data]
 */
export function fail(status, data) {
	return new ActionFailure(status, data);
}

const basic_param_pattern = /\[(\[)?(?:\.\.\.)?(\w+?)(?:=(\w+))?\]\]?/g;

/**
 * Populate a route ID with params to resolve a pathname.
 * @example
 * ```js
 * resolvePath(
 *   `/blog/[slug]/[...somethingElse]`,
 *   {
 *     slug: 'hello-world',
 *     somethingElse: 'something/else'
 *   }
 * ); // `/blog/hello-world/something/else`
 * ```
 * @param {string} id
 * @param {Record<string, string | undefined>} params
 * @returns {string}
 */
export function resolvePath(id, params) {
	const segments = get_route_segments(id);
	return (
		'/' +
		segments
			.map((segment) =>
				segment.replace(basic_param_pattern, (_, optional, name) => {
					const param_value = params[name];

					// This is nested so TS correctly narrows the type
					if (!param_value) {
						if (optional) return '';
						throw new Error(`Missing parameter '${name}' in route ${id}`);
					}

					if (param_value.startsWith('/') || param_value.endsWith('/'))
						throw new Error(
							`Parameter '${name}' in route ${id} cannot start or end with a slash -- this would cause an invalid route like foo//bar`
						);
					return param_value;
				})
			)
			.filter(Boolean)
			.join('/')
	);
}
