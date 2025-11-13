import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';

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
 * @param {unknown} error
 * @returns {number}
 */
export function get_status(error) {
	if (error instanceof HttpError || error instanceof SvelteKitError) {
		return error.status;
	}
	// For overrides / custom error objects
	if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
		return error.status;
	}
	return 500;
}

/**
 * @param {unknown} error
 */
export function get_message(error) {
	return error instanceof SvelteKitError ? error.text : 'Internal Error';
}
