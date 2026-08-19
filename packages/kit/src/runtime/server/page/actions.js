/** @import { RequestEvent, Actions } from '@sveltejs/kit' */
/** @import { ActionResult } from '$app/forms' */
/** @import { SSROptions, SSRNode, ServerNode, ServerActionResult } from 'types' */
import { DEV } from 'esm-env';
import { HttpError, Redirect, ActionFailure, SvelteKitError } from '@sveltejs/kit/internal';
import { with_request_store, merge_tracing, record_span } from '@sveltejs/kit/internal/server';
import { normalize_error } from '../../../utils/error.js';
import { is_form_content_type, negotiate } from '../../../utils/http.js';
import { with_version_header } from '../utils.js';
import { handle_error_and_jsonify } from '../errors.js';
import { stringify, uneval } from '#app/internal/transport';

/** @param {RequestEvent} event */
export function is_action_json_request(event) {
	const accept = negotiate(event.request.headers.get('accept') ?? '*/*', [
		'application/json',
		'text/html'
	]);

	return accept === 'application/json' && event.request.method === 'POST';
}

/**
 * @param {RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {SSROptions} options
 * @param {SSRNode['server'] | undefined} server
 */
export async function handle_action_json_request(event, state, options, server) {
	const result = await handle_action_request(event, state, server);
	return action_result_json(event, state, options, result);
}

/**
 * @param {RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {SSROptions} options
 * @param {ServerActionResult} result
 * @returns {Promise<Response>}
 */
async function action_result_json(event, state, options, result) {
	if (result.type === 'redirect') {
		return action_json(result);
	}

	if (result.type === 'error') {
		const error = await handle_error_and_jsonify(event, state, options, result.error);
		return action_json({ ...result, error }, { status: error.status });
	}

	if (result.type === 'success' && !result.data) {
		return action_json({ ...result, status: 204, data: undefined });
	}

	try {
		return action_json(
			{
				...result,
				// @ts-expect-error we assign a string to what is supposed to be an object. That's ok
				// because we don't use the object outside, and this way we have better code navigation
				// through knowing where the related interface is used.
				data: try_serialize(result.data, stringify, /** @type {string} */ (event.route.id))
			},
			{ status: result.status }
		);
	} catch (e) {
		return action_result_json(event, state, options, action_error_result(e, result.location));
	}
}

/**
 * @param {URL} url
 */
export function get_action_location(url) {
	const location = new URL(url);

	for (const key of location.searchParams.keys()) {
		if (key.startsWith('/')) {
			location.searchParams.delete(key);
			break;
		}
	}

	return location.pathname + location.search;
}

/**
 * @param {RequestEvent} event
 * @param {string} location
 * @returns {Extract<ServerActionResult, { type: 'error' }>}
 */
export function method_not_allowed_result(event, location) {
	event.setHeaders({
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
		// "The server must generate an Allow header field in a 405 status code response"
		allow: 'GET'
	});
	return {
		type: 'error',
		location,
		error: new SvelteKitError(
			405,
			'Method Not Allowed',
			`POST method not allowed. No form actions exist for ${DEV ? `the page at ${event.route.id}` : 'this page'}`
		)
	};
}

/**
 * @param {unknown} e
 * @param {string} location
 * @returns {Extract<ServerActionResult, { type: 'redirect' | 'error' }>}
 */
export function action_error_result(e, location) {
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
		location,
		error: err
	};
}

/**
 * @param {Redirect} redirect
 */
export function action_json_redirect(redirect) {
	return action_json({
		type: 'redirect',
		status: redirect.status,
		location: redirect.location
	});
}

/**
 * @param {ActionResult} data
 * @param {ResponseInit} [init]
 */
function action_json(data, init) {
	return with_version_header(Response.json(data, init));
}

/**
 * @param {RequestEvent} event
 */
export function is_action_request(event) {
	return event.request.method === 'POST';
}

/**
 * @param {RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {SSRNode['server'] | undefined} server
 * @returns {Promise<ServerActionResult>}
 */
export async function handle_action_request(event, state, server) {
	const actions = server?.actions;
	const location = get_action_location(event.url);

	if (!actions) {
		// TODO should this be a different error altogether?
		return method_not_allowed_result(event, location);
	}

	check_named_default_separate(actions);

	try {
		const data = await call_action(event, state, actions);

		if (DEV) {
			validate_action_return(data);
		}

		if (data instanceof ActionFailure) {
			return {
				type: 'failure',
				status: data.status,
				location,
				data: data.data
			};
		} else {
			return {
				type: 'success',
				status: 200,
				location,
				// @ts-expect-error this will be removed upon serialization, so `undefined` is the same as omission
				data
			};
		}
	} catch (e) {
		return action_error_result(
			e instanceof ActionFailure ? new Error('Cannot "throw fail()". Use "return fail()"') : e,
			location
		);
	}
}

/**
 * @param {Actions} actions
 */
function check_named_default_separate(actions) {
	if (actions.default && Object.keys(actions).length > 1) {
		throw new Error(
			'When using named actions, the default action cannot be used. See the docs for more info: https://svelte.dev/docs/kit/form-actions#named-actions'
		);
	}
}

/**
 * @param {RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {NonNullable<ServerNode['actions']>} actions
 * @throws {Redirect | HttpError | SvelteKitError | Error}
 */
async function call_action(event, state, actions) {
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

	if (!Object.hasOwn(actions, name)) {
		throw new SvelteKitError(404, 'Not Found', `No action with name '${name}' found`);
	}

	const action = actions[name];

	if (!is_form_content_type(event.request)) {
		throw new SvelteKitError(
			415,
			'Unsupported Media Type',
			`Form actions expect form-encoded data — received ${event.request.headers.get(
				'content-type'
			)}`
		);
	}

	return record_span({
		name: 'sveltekit.form_action',
		attributes: {
			'sveltekit.form_action.name': name,
			'http.route': event.route.id || 'unknown'
		},
		fn: async (current) => {
			const traced_event = merge_tracing(event, current);

			const result = await with_request_store({ event: traced_event, state }, () =>
				action(traced_event)
			);

			if (result instanceof ActionFailure) {
				current.setAttributes({
					'sveltekit.form_action.result.type': 'failure',
					'sveltekit.form_action.result.status': result.status
				});
			}

			return result;
		}
	});
}

/** @param {any} data */
function validate_action_return(data) {
	if (data instanceof Redirect) {
		throw new Error('Cannot `return redirect(...)` — use `redirect(...)` instead');
	}

	if (data instanceof HttpError) {
		throw new Error('Cannot `return error(...)` — use `error(...)` or `return fail(...)` instead');
	}
}

/**
 * Try to `devalue.uneval` the data object, and if it fails, return a proper Error with context
 * @param {any} data
 * @param {string} route_id
 */
export function uneval_action_response(data, route_id) {
	return try_serialize(data, uneval, route_id);
}

/**
 * @param {any} data
 * @param {(data: any) => string} fn
 * @param {string} route_id
 */
function try_serialize(data, fn, route_id) {
	try {
		return fn(data);
	} catch (e) {
		// If we're here, the data could not be serialized with devalue
		const error = /** @type {any} */ (e);

		// if someone tries to use `json()` in their action
		if (data instanceof Response) {
			throw new Error(
				`Data returned from action inside ${route_id} is not serializable. Form actions need to return plain objects or fail(). E.g. return { success: true } or return fail(400, { message: "invalid" });`,
				{ cause: e }
			);
		}

		// if devalue could not serialize a property on the object, etc.
		if ('path' in error) {
			let message = `Data returned from action inside ${route_id} is not serializable: ${error.message}`;
			if (error.path !== '') message += ` (data.${error.path})`;
			throw new Error(message, { cause: e });
		}

		throw error;
	}
}
