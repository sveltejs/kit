import { styleText } from 'node:util';

/**
 * @typedef {{ cause?: unknown; stackless?: boolean; location?: string }} ThrowOptions
 */

/**
 * @param {string} code
 * @param {string} message
 */
function format(code, message) {
	return `${code}\n${message}\nhttps://next.svelte.dev/e/@sveltejs/kit/${code}`;
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
 * @param {string} code
 * @param {string} message
 */
export function warn(code, message) {
	console.warn(styleText(['bold', 'yellow'], format(code, message)));
}
