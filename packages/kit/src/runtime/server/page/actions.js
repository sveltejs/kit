import { error, json } from '../../../exports/index.js';
import { normalize_error } from '../../../utils/error.js';
import { negotiate } from '../../../utils/http.js';
import { HttpError, Redirect, ValidationError } from '../../control.js';
import { error_to_pojo } from '../utils.js';

/** @param {import('types').RequestEvent} event */
export function is_action_json_request(event) {
	const accept = negotiate(event.request.headers.get('accept') ?? '*/*', [
		'application/json',
		'text/html'
	]);

	return (
		accept === 'application/json' &&
		event.request.method === 'POST'
	);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} server
 */
export async function handle_action_json_request(event, options, server) {
	const actions = server.actions;

	if (!actions) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		return new Response('POST method not allowed. No actions exist for this page', {
			status: 405,
			headers: {
				// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
				// "The server must generate an Allow header field in a 405 status code response"
				allow: 'GET'
			}
		});
	}

	try {
		const data = await call_action(event, actions);

		if (data instanceof ValidationError) {
			return action_json({ type: 'invalid', status: data.status, data: data.data });
		} else {
			return action_json({
				type: 'success',
				status: data ? 200 : 204,
				data: /** @type {Record<string, any> | undefined} */ (data)
			});
		}
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			return action_json({
				type: 'redirect',
				status: error.status,
				location: error.location
			});
		}

		if (!(error instanceof HttpError)) {
			options.handle_error(error, event);
		}

		return json(error_to_pojo(error, options.get_stack), {
			status: error instanceof HttpError ? error.status : 500
		});
	}
}

/** @param {import('types').FormFetchResponse} data */
function action_json(data) {
	return json(data);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode} leaf_node
 */
export function is_action_request(event, leaf_node) {
	return leaf_node.server && event.request.method !== 'GET' && event.request.method !== 'HEAD';
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode['server']} server
 * @returns {Promise<import('$app/forms').SubmissionResult>}
 */
export async function handle_action_request(event, server) {
	const actions = server.actions;

	if (!actions) {
		maybe_throw_migration_error(server);
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

	try {
		const data = await call_action(event, actions);

		if (data instanceof ValidationError) {
			return { type: 'invalid', status: data.status, data: data.data };
		} else {
			return {
				type: 'success',
				status: 200,
				data: /** @type {Record<string, any> | undefined} */ (data)
			};
		}
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			return {
				type: 'redirect',
				status: error.status,
				location: error.location
			};
		}

		return { type: 'error', error };
	}
}

/**
 * @param {import('types').RequestEvent} event
 * @param {NonNullable<import('types').SSRNode['server']['actions']>} actions
 * @throws {Redirect | ValidationError | HttpError | Error}
 */
export async function call_action(event, actions) {
	const url = new URL(event.request.url);

	let name = 'default';
	for (const param of url.searchParams) {
		if (param[0].startsWith('/')) {
			name = param[0].slice(1);
			break;
		}
	}

	const action = actions[name];
	if (!action) {
		throw new Error(`No action with name '${name}' found`);
	}

	const type = event.request.headers.get('content-type')?.split('; ')[0];
	if (type !== 'application/x-www-form-urlencoded' && type !== 'multipart/form-data') {
		throw new Error(`Actions expect form-encoded data (received ${type})`);
	}

	return action(event);
}

/**
 * @param {import('types').SSRNode['server']} server
 */
function maybe_throw_migration_error(server) {
	for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
		if (/** @type {any} */ (server)[method]) {
			throw new Error(
				`${method} method no longer allowed in +page.server, use actions instead. See the PR for more info: https://github.com/sveltejs/kit/pull/6469`
			);
		}
	}
}
