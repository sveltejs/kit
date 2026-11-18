import { styleText } from 'node:util';

/**
 * @typedef {{ cause?: unknown; stackless?: boolean; location?: string }} ThrowOptions
 */

/**
 * @param {string} code
 * @param {string} message
 */
function format(code, message) {
	return `${code}\n${message}\nhttps://svelte.dev/e/kit/${code}`;
}

/**
 * @param {string} code
 * @param {string} message
 * @param {ThrowOptions | undefined} options
 * @param {Function} caller The generated helper, which is omitted from the stack along with this function
 * @returns {never}
 */
export function throw_error(code, message, options, caller) {
	const error = new Error(
		format(code, message),
		options?.cause === undefined ? undefined : { cause: options.cause }
	);
	error.name = 'SvelteKit error';

	if (options?.location) error.stack = `${error.message}\n    at ${options.location}`;
	else if (options?.stackless) error.stack = '';
	else Error.captureStackTrace(error, caller);

	throw error;
}

/**
 * Returns the message of the diagnostic thrown by `fn`, for the few places that need the
 * formatted text as a string (callbacks, CLI output, generated code) rather than a thrown error.
 * There's probably a better solution to this, but it's needed so
 * sparsely that it would almost certainly not be worth the effort
 * @param {() => never} fn A function that calls a generated `build-errors` helper
 * @returns {string}
 */
export function capture_message(fn) {
	try {
		fn();
	} catch (error) {
		return /** @type {Error} */ (error).message;
	}
}

/**
 * @param {string} code
 * @param {string} message
 */
export function warn(code, message) {
	console.warn(styleText(['bold', 'yellow'], format(code, message)));
}
