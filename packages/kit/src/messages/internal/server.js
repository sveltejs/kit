/**
 * @typedef {{ cause?: unknown; stackless?: boolean }} ServerThrowOptions
 */

/**
 * Throws the full diagnostic. Unlike shared errors, server-only errors keep their full text in production
 * @param {string} code
 * @param {string} message
 * @param {ServerThrowOptions | undefined} options
 * @param {Function} caller The generated helper, which is omitted from the stack along with this function
 * @returns {never}
 */
export function throw_error(code, message, options, caller) {
	const error = new Error(
		`${code}\n${message}\nhttps://svelte.dev/e/kit/${code}`,
		options?.cause === undefined ? undefined : { cause: options.cause }
	);
	error.name = 'SvelteKit error';

	if (options?.stackless) error.stack = '';
	// not available in every runtime, in which case the stack also includes these two frames
	else Error.captureStackTrace?.(error, caller);

	throw error;
}

/**
 * Returns the error thrown by `fn`, for the few places that pass an error on (for example to
 * `handleError` or a later `console.error`) rather than throwing it. Its stack starts inside `fn`
 * @param {() => never} fn A function that calls a generated `server-errors` helper
 * @returns {Error}
 */
export function capture_error(fn) {
	try {
		fn();
	} catch (error) {
		return /** @type {Error} */ (error);
	}
}
