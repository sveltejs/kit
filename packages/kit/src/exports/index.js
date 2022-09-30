import { HttpError, Redirect, ValidationError } from '../runtime/control.js';

// For some reason we need to type the params as well here,
// JSdoc doesn't seem to like @type with function overloads
/**
 * @type {import('@sveltejs/kit').error}
 * @param {number} status
 * @param {any} message
 */
export function error(status, message) {
	return new HttpError(status, message);
}

/** @type {import('@sveltejs/kit').redirect} */
export function redirect(status, location) {
	if (isNaN(status) || status < 300 || status > 399) {
		throw new Error('Invalid status code');
	}

	return new Redirect(status, location);
}

/** @type {import('@sveltejs/kit').json} */
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

/**
 * Generates a `ValidationError` object.
 * @param {number} status
 * @param {Record<string, any> | undefined} [data]
 */
export function invalid(status, data) {
	return new ValidationError(status, data);
}
