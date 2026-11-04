import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import * as w from '../messages/shared-warnings.js';

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
 * @param {Error} error
 * @param {string} stack
 * @returns {string | undefined}
 */
export function set_error_stack(error, stack) {
	try {
		// Unlike assignment in strict mode, Reflect.set returns false for a read-only property
		Reflect.set(error, 'stack', stack);
	} catch {
		// A custom setter or proxy trap may still throw
	}

	return error.stack;
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
				w.handle_error_status_deprecated();
				return fallback.status;
			}
		},
		message: {
			get() {
				w.handle_error_message_deprecated();
				return fallback.message;
			}
		}
	});

	return input;
}
