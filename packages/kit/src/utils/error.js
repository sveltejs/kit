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
	return /** @type {import('../exports/internal/shared.js').Redirect | HttpError | SvelteKitError | Error} */ (
		error
	);
}

/**
 * @param {unknown} error
 */
export function get_status(error) {
	return error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;
}

/**
 * Adds development-only compatibility accessors for the former top-level `status` and `message`
 * properties of the `handleError` hook input.
 * @template {object} T
 * @param {T} input
 * @param {{ status: number; message: string }} fallback
 * @returns {T}
 */
export function add_deprecated_handle_error_properties(input, fallback) {
	Object.defineProperties(input, {
		status: {
			get() {
				console.warn(
					'The `status` property of `handleError` is deprecated. Use `error.status` for expected and framework errors, or `500` for unexpected errors.'
				);
				return fallback.status;
			}
		},
		message: {
			get() {
				console.warn(
					"The `message` property of `handleError` is deprecated. Use `error.message` for expected and framework errors, or 'Internal Error' for unexpected errors."
				);
				return fallback.message;
			}
		}
	});

	return input;
}
