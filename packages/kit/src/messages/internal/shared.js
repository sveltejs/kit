/**
 * Whether shared errors include their full text on the server even though `DEV` is false. This is
 * enabled while the app is being built (analysed or prerendered)
 */
export let verbose = false;

export function enable_verbose_errors() {
	verbose = true;
}

/**
 * @typedef {{ element?: Element }} ClientWarningOptions
 * - `element`: logged after the warning, so that it can be inspected in the browser's devtools
 */

/** `console.warn` styles for the code and text of shared runtime warnings, as in Svelte */
export const bold = 'font-weight: bold';
export const normal = 'font-weight: normal';

/**
 * Throws the full diagnostic. Generated helpers throw their URL-only production error inline, so
 * bundlers can remove both this call and the message text from production browser builds
 * @param {string} code
 * @param {string} message
 * @param {Function} caller The generated helper, which is omitted from the stack along with this function
 * @returns {never}
 */
export function throw_error(code, message, caller) {
	const error = new Error(`${code}\n${message}\nhttps://svelte.dev/e/kit/${code}`);
	error.name = 'SvelteKit error';

	// not available in every browser, in which case the stack also includes these two frames
	Error.captureStackTrace?.(error, caller);

	throw error;
}

/**
 * Returns the error thrown by `fn`, for the few places that pass an error on (for example to
 * `handleError`) rather than throwing it. Unlike `capture_error` in `./server.js`, this can be
 * bundled for browsers, so the thrown error only contains the URL in production
 * @param {() => never} fn A function that calls a generated `client-errors` or `shared-errors` helper
 * @returns {Error}
 */
export function capture_error(fn) {
	try {
		fn();
	} catch (error) {
		return /** @type {Error} */ (error);
	}
}
