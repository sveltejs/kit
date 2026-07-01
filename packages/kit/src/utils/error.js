import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';

/**
 * For times when you need to throw an error, but without
 * displaying a useless stack trace (since the developer
 * can't do anything useful with it)
 * @param {string} message
 */
export function stackless(message) {
	const error = new Error(message);
	error.stack = '';
	return error;
}

/**
 * @param {unknown} err
 * @return {Error}
 */
export function coalesce_to_error(err) {
	return err instanceof Error ||
		(err && /** @type {any} */ (err).name && /** @type {any} */ (err).message)
		? /** @type {Error} */ (err)
		: new Error(JSON.stringify(err));
}

/**
 * This is an identity function that exists to make TypeScript less
 * paranoid about people throwing things that aren't errors, which
 * frankly is not something we should care about
 * @param {unknown} error
 */
export function normalize_error(error) {
	return /** @type {import('../exports/internal/index.js').Redirect | HttpError | SvelteKitError | Error} */ (
		error
	);
}

/**
 * @param {any} transformed
 * @param {any} [error]
 */
export function get_status(transformed, error) {
	const err = error ?? transformed;
	const status = err instanceof HttpError || err instanceof SvelteKitError ? err.status : 500;

	if (error == null || typeof transformed?.status !== 'number') {
		return status;
	} else {
		return transformed.status;
	}
}

/**
 * @param {unknown} error
 */
export function get_message(error) {
	return error instanceof SvelteKitError ? error.text : 'Internal Error';
}
