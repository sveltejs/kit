import { json, text } from '@sveltejs/kit';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store } from '@sveltejs/kit/internal/server';
import { coalesce_to_error, get_message, get_status } from '../../utils/error.js';
import { negotiate } from '../../utils/http.js';
import { fix_stack_trace } from './internal.js';
import { escape_html } from '../../utils/escape.js';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {import('types').SSROptions} options
 * @param {unknown} error
 */
export async function handle_fatal_error(event, state, options, error) {
	error = error instanceof HttpError ? error : coalesce_to_error(error);
	const body = await handle_error_and_jsonify(event, state, options, error);
	const status = body.status;

	// sec-fetch-dest would be nicer, but non-browser clients and plain HTTP hosts don't send it
	const type = negotiate(event.request.headers.get('accept') || 'text/html', [
		'application/json',
		'text/html'
	]);

	if (event.isDataRequest || type === 'application/json') {
		return json(body, {
			status
		});
	}

	return static_error_page(options, status, body.message);
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {import('types').SSROptions} options
 * @param {any} error
 * @returns {App.Error | Promise<App.Error>}
 */
export function handle_error_and_jsonify(event, state, options, error) {
	if (error instanceof HttpError) {
		// @ts-expect-error custom user errors may not have a message field if App.Error is overwritten
		return { message: 'Unknown Error', ...error.body };
	}

	let e = error;
	while (e instanceof Error) {
		fix_stack_trace(e);
		e = e.cause;
	}

	const status = get_status(error);
	const message = get_message(error);

	// TODO 4.0 await this, rather than handling the non-Promise case
	let result;
	try {
		result = with_request_store({ event, state }, () =>
			options.hooks.handleError({ error, event, status, message })
		) ?? { status, message };
	} catch (hook_error) {
		log_handle_error_hook_failure(error, hook_error);
		return { status, message: 'Internal Error' };
	}

	if (result instanceof Promise) {
		if (!__SVELTEKIT_SUPPORTS_ASYNC__ && state.is_in_render) {
			console.warn(
				`To use an async \`handleError\` hook to handle errors that occur during rendering, you must enable \`compilerOptions.experimental.async\` in the SvelteKit plugin of your Vite config. The returned error has been replaced with a generic object`
			);

			// we're discarding the result, but we still need to prevent an unhandled
			// rejection if the user's async `handleError` hook rejects
			result.catch((hook_error) => log_handle_error_hook_failure(error, hook_error));

			return {
				status,
				message: 'Internal Error'
			};
		}

		return result.then(
			(body) => {
				body ??= { status, message };
				return { ...body, status: get_status(body, error) };
			},
			(hook_error) => {
				log_handle_error_hook_failure(error, hook_error);
				return { status, message: 'Internal Error' };
			}
		);
	}

	return { ...result, status: get_status(result, error) };
}

/**
 * @param {unknown} error
 * @param {unknown} hook_error
 */
function log_handle_error_hook_failure(error, hook_error) {
	const failure = new Error('The `handleError` hook failed', {
		cause: coalesce_to_error(hook_error)
	});
	failure.stack = failure.message;
	console.error(failure);
	if (error instanceof SvelteKitError) {
		console.error(`Original error: ${error.status} ${error.text}: ${error.message}`);
	} else {
		console.error('Original error:', error);
	}
}

/**
 * Return as a response that renders the error.html
 *
 * @param {import('types').SSROptions} options
 * @param {number} status
 * @param {string} message
 */
export function static_error_page(options, status, message) {
	let page = options.templates.error({ status, message: escape_html(message) });

	if (__SVELTEKIT_DEV__) {
		// inject Vite HMR client, for easier debugging
		page = page.replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
	}

	return text(page, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
		status
	});
}
