import { HttpError, Redirect } from './private.js';

/**
 * Creates an `HttpError` object with an HTTP status code and an optional message.
 * This object, if thrown during request handling, will cause SvelteKit to
 * return an error response without invoking `handleError`
 * @param {number} status
 * @param {string | undefined} [message]
 */
export function error(status, message) {
	return new HttpError(status, message);
}

/**
 * Creates a `Redirect` object. If thrown during request handling, SvelteKit will
 * return a redirect response.
 * @param {number} status
 * @param {string} location
 */
export function redirect(status, location) {
	if (isNaN(status) || status < 300 || status > 399) {
		throw new Error('Invalid status code');
	}

	return new Redirect(status, location);
}

/**
 * Generates a JSON `Response` object from the supplied data.
 * @param {any} data
 * @param {ResponseInit} [init]
 */
export function json(data, init) {
	// TODO deprecate this in favour of `Response.json` when it's
	// more widely supported
	const headers = new Headers(init?.headers);
	if (!headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	return new Response(JSON.stringify(data), {
		...init,
		headers
	});
}
