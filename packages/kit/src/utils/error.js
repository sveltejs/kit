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
 * @param {unknown} error
 * @returns {number | undefined}
 */
export function get_status_if_known(error) {
	if (error instanceof HttpError || error instanceof SvelteKitError) return error.status;
	// Fallback for cross-bundle instanceof failures (e.g. adapter-node inlining its own @sveltejs/kit copy); Number.isFinite rejects NaN
	const e = /** @type {any} */ (error);
	if (
		e != null &&
		(e.name === 'SvelteKitError' || e.name === 'HttpError') &&
		Number.isFinite(e.status)
	) {
		return e.status;
	}
	return undefined;
}

/**
 * @param {unknown} error
 */
export function get_status(error) {
	return get_status_if_known(error) ?? 500;
}

/**
 * Detects {@link HttpError} instances, including across bundle boundaries where
 * `instanceof` fails (e.g. adapter-node inlining its own `@sveltejs/kit` copy)
 * @param {unknown} error
 * @returns {error is HttpError}
 */
export function is_http_error(error) {
	if (error instanceof HttpError) return true;
	// Require a `body` too: this predicate narrows to `HttpError`, whose consumers read
	// `error.body.message`. A genuine HttpError always has a body (the constructor defaults
	// it), so this only rejects hand-spoofed objects, not real cross-bundle instances.
	const e = /** @type {any} */ (error);
	return e != null && e.name === 'HttpError' && Number.isFinite(e.status) && e.body != null;
}

/**
 * @param {unknown} error
 */
export function get_message(error) {
	if (error instanceof SvelteKitError) return error.text;
	// Fallback for cross-bundle instanceof failures; HttpError omitted — it has no text field
	const e = /** @type {any} */ (error);
	if (e != null && e.name === 'SvelteKitError' && typeof e.text === 'string') return e.text;
	return 'Internal Error';
}
