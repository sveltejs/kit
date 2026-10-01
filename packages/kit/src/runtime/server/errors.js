import {
	HandledHttpError,
	HttpError,
	SvelteKitError,
	ValidationError
} from '@sveltejs/kit/internal';
import { with_request_store } from '@sveltejs/kit/internal/server';
import { add_deprecated_handle_error_properties, coalesce_to_error } from '../../utils/error.js';
// `$app/server` reaches this module, so it must not import anything generated
import { fix_stack_trace, hooks } from './internal.js';
import { capture_error } from '../../messages/internal/server.js';
import * as e from '../../messages/server-errors.js';
import * as w from '../../messages/server-warnings.js';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {any} error
 * @returns {App.Error | Promise<App.Error>}
 */
export function handle_error_and_jsonify(event, state, error) {
	if (error instanceof HandledHttpError) {
		return error.body;
	}

	/** @type {import('@sveltejs/kit/hooks').CaughtError} */
	let caught;

	if (error instanceof HttpError) {
		caught = { kind: 'app', error: error.body };
	} else if (error instanceof SvelteKitError) {
		caught = { kind: 'framework', error: { status: error.status, message: error.text } };
	} else if (error instanceof ValidationError) {
		caught = {
			kind: 'validation',
			error: { status: 400, message: 'Bad Request' },
			issues: error.issues
		};
	} else {
		caught = { kind: 'unknown', error };

		let e = error;
		while (e instanceof Error) {
			fix_stack_trace(e);
			e = e.cause;
		}
	}

	const fallback =
		caught.kind === 'unknown' ? { status: 500, message: 'Internal Error' } : caught.error;

	/**
	 * The hook returns only the properties it wants to override; anything it omits
	 * (including by returning nothing at all) is inherited from the caught error.
	 * @param {Awaited<ReturnType<import('@sveltejs/kit/hooks').HandleServerError>>} body
	 * @returns {App.Error}
	 */
	function merge(body) {
		return { ...fallback, ...body };
	}

	// TODO 4.0 await this, rather than handling the non-Promise case
	let result;
	try {
		const input = { ...caught, event };
		if (__SVELTEKIT_DEV__) add_deprecated_handle_error_properties(input, fallback);

		result = with_request_store({ event, state }, () => hooks.handleError(input));
	} catch (hook_error) {
		log_handle_error_hook_failure(error, hook_error);
		return { status: fallback.status, message: 'Internal Error' };
	}

	if (result instanceof Promise) {
		if (!__SVELTEKIT_SUPPORTS_ASYNC__ && state.is_in_render) {
			w.handle_error_async_without_async_svelte();

			// we're discarding the result, but we still need to prevent an unhandled
			// rejection if the user's async `handleError` hook rejects
			result.catch((hook_error) => log_handle_error_hook_failure(error, hook_error));

			return {
				status: fallback.status,
				message: 'Internal Error'
			};
		}

		return result.then(merge, (hook_error) => {
			log_handle_error_hook_failure(error, hook_error);
			return { status: fallback.status, message: 'Internal Error' };
		});
	}

	return merge(result);
}

/**
 * @param {unknown} error
 * @param {unknown} hook_error
 */
function log_handle_error_hook_failure(error, hook_error) {
	const failure = capture_error(() =>
		e.handle_error_hook_failed(undefined, { cause: coalesce_to_error(hook_error) })
	);
	// only show the diagnostic and the cause, not a stack trace of SvelteKit's internals
	failure.stack = `${failure.name}: ${failure.message}`;
	console.error(failure);
	if (error instanceof SvelteKitError) {
		console.error(`Original error: ${error.status} ${error.text}: ${error.message}`);
	} else {
		console.error('Original error:', error);
	}
}
