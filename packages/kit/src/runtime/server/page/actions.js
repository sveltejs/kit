import * as devalue from 'devalue';
import { error, json } from '../../../exports/index.js';
import { normalize_error } from '../../../utils/error.js';
import { is_form_content_type, negotiate } from '../../../utils/http.js';
import { HttpError, Redirect, ActionFailure } from '../../control.js';
import { handle_error_and_jsonify } from '../utils.js';

/** @param {import('@sveltejs/kit').RequestEvent} event */
export function is_action_json_request(event) {
	const accept = negotiate(event.request.headers.get('accept') ?? '*/*', [
		'application/json',
		'text/html'
	]);

	return accept === 'application/json' && event.request.method === 'POST';
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server'] | undefined} server
 */
export async function handle_action_json_request(event, options, server) {
	const actions = server?.actions;

	if (!actions) {
		// TODO should this be a different error altogether?
		const no_actions_error = error(405, 'POST method not allowed. No actions exist for this page');
		return action_json(
			{
				type: 'error',
				error: await handle_error_and_jsonify(event, options, no_actions_error)
			},
			{
				status: no_actions_error.status,
				headers: {
					// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
					// "The server must generate an Allow header field in a 405 status code response"
					allow: 'GET'
				}
			}
		);
	}

	check_named_default_separate(actions);

	try {
		const data = await call_action(event, actions);

		if (__SVELTEKIT_DEV__) {
			validate_action_return(data);
		}

		if (data instanceof ActionFailure) {
			return action_json({
				type: 'failure',
				status: data.status,
				// @ts-expect-error we assign a string to what is supposed to be an object. That's ok
				// because we don't use the object outside, and this way we have better code navigation
				// through knowing where the related interface is used.
				data: stringify_action_response(data.data, /** @type {string} */ (event.route.id))
			});
		} else {
			return action_json({
				type: 'success',
				status: data ? 200 : 204,
				// @ts-expect-error see comment above
				data: stringify_action_response(data, /** @type {string} */ (event.route.id))
			});
		}
	} catch (e) {
		const err = normalize_error(e);

		if (err instanceof Redirect) {
			return action_json_redirect(err);
		}

		return action_json(
			{
				type: 'error',
				error: await handle_error_and_jsonify(event, options, check_incorrect_fail_use(err))
			},
			{
				status: err instanceof HttpError ? err.status : 500
			}
		);
	}
}

/**
 * @param {HttpError | Error} error
 */
function check_incorrect_fail_use(error) {
	return error instanceof ActionFailure
		? new Error('Cannot "throw fail()". Use "return fail()"')
		: error;
}

/**
 * @param {import('@sveltejs/kit').Redirect} redirect
 */
export function action_json_redirect(redirect) {
	return action_json({
		type: 'redirect',
		status: redirect.status,
		location: redirect.location
	});
}

/**
 * @param {import('@sveltejs/kit').ActionResult} data
 * @param {ResponseInit} [init]
 */
function action_json(data, init) {
	return json(data, init);
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function is_action_request(event) {
	return event.request.method === 'POST';
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').SSRNode['server'] | undefined} server
 * @returns {Promise<import('@sveltejs/kit').ActionResult>}
 */
export async function handle_action_request(event, server) {
	const actions = server?.actions;

	if (!actions) {
		// TODO should this be a different error altogether?
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: 'GET'
		});
		return {
			type: 'error',
			error: error(405, 'POST method not allowed. No actions exist for this page')
		};
	}

	check_named_default_separate(actions);

	try {
		const data = await call_action(event, actions);

		if (__SVELTEKIT_DEV__) {
			validate_action_return(data);
		}

		if (data instanceof ActionFailure) {
			return {
				type: 'failure',
				status: data.status,
				data: data.data
			};
		} else {
			return {
				type: 'success',
				status: 200,
				// @ts-expect-error this will be removed upon serialization, so `undefined` is the same as omission
				data
			};
		}
	} catch (e) {
		const err = normalize_error(e);

		if (err instanceof Redirect) {
			return {
				type: 'redirect',
				status: err.status,
				location: err.location
			};
		}

		return {
			type: 'error',
			error: check_incorrect_fail_use(err)
		};
	}
}

/**
 * @param {import('@sveltejs/kit').Actions} actions
 */
function check_named_default_separate(actions) {
	if (actions.default && Object.keys(actions).length > 1) {
		throw new Error(
			'When using named actions, the default action cannot be used. See the docs for more info: https://kit.svelte.dev/docs/form-actions#named-actions'
		);
	}
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {NonNullable<import('types').SSRNode['server']['actions']>} actions
 * @throws {Redirect | ActionFailure | HttpError | Error}
 */
async function call_action(event, actions) {
	const url = new URL(event.request.url);

	let name = 'default';
	for (const param of url.searchParams) {
		if (param[0].startsWith('/')) {
			name = param[0].slice(1);
			if (name === 'default') {
				throw new Error('Cannot use reserved action name "default"');
			}
			break;
		}
	}

	const action = actions[name];
	if (!action) {
		throw new Error(`No action with name '${name}' found`);
	}

	if (!is_form_content_type(event.request)) {
		throw new Error(
			`Actions expect form-encoded data (received ${event.request.headers.get('content-type')})`
		);
	}

	return action(event);
}

/** @param {any} data */
function validate_action_return(data) {
	if (data instanceof Redirect) {
		throw new Error('Cannot `return redirect(...)` — use `throw redirect(...)` instead');
	}

	if (data instanceof HttpError) {
		throw new Error(
			'Cannot `return error(...)` — use `throw error(...)` or `return fail(...)` instead'
		);
	}
}

/**
 * Try to `devalue.uneval` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {string} route_id
 */
export function uneval_action_response(data, route_id) {
	return try_deserialize(data, devalue.uneval, route_id);
}

/**
 * Try to `devalue.stringify` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {string} route_id
 */
function stringify_action_response(data, route_id) {
	return try_deserialize(data, devalue.stringify, route_id);
}

/**
 * @param {any} data
 * @param {(data: any) => string} fn
 * @param {string} route_id
 */
function try_deserialize(data, fn, route_id) {
	try {
		return fn(data);
	} catch (e) {
		// If we're here, the data could not be serialized with devalue
		const error = /** @type {any} */ (e);

		if ('path' in error) {
			let message = `Data returned from action inside ${route_id} is not serializable: ${error.message}`;
			if (error.path !== '') message += ` (data.${error.path})`;
			throw new Error(message);
		}

		throw error;
	}
}
