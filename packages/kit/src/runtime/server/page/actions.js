import { error, json } from '../../../exports/index.js';
import { negotiate } from '../../../utils/http.js';
import { HttpError, Redirect, ValidationError } from '../../control.js';
import { error_to_pojo } from '../utils.js';

/**
 * @param {import('types').RequestEvent} event
 */
export function is_action_json_request(event) {
	console.log(event.request.headers.get('accept'));
	const accept = negotiate(event.request.headers.get('accept') || 'text/html', [
		'text/html',
		'application/json'
	]);

	return (
		accept === 'application/json' &&
		event.request.method !== 'GET' &&
		event.request.method !== 'HEAD'
	);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} server
 */
export async function handle_action_json_request(event, options, server) {
	// TODO create POJO interface for this? Something like
	// {status: number, errors?: Record<string, any>, location?: string, values?: Record<string, any>, result?: Record<string, any>}
	const handler = server.actions;

	if (!handler) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		return new Response('POST method not allowed. No actions exist for this page', {
			status: 405,
			headers: {
				// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
				// "The server must generate an Allow header field in a 405 status code response"
				allow: ''
			}
		});
	}

	try {
		const result = await handler.call(null, event);
		if (!result) {
			// TODO json({status: 204}) instead?
			return new Response(undefined, {
				status: 204
			});
		} else {
			return json({ status: 200, result });
		}
	} catch (e) {
		const error = /** @type {Redirect | HttpError | ValidationError | Error} */ (e);

		if (error instanceof Redirect) {
			return json({ status: 303, location: error.location });
		}

		if (error instanceof ValidationError) {
			return json(
				{
					status: error.status,
					values: error.values,
					errors: error.errors
				},
				{ status: error.status }
			);
		}

		if (!(error instanceof HttpError)) {
			options.handle_error(error, event);
		}

		return json(error_to_pojo(error, options.get_stack), {
			status: error instanceof HttpError ? error.status : 500
		});
	}
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode} leaf_node
 * @returns
 */
export function is_action_request(event, leaf_node) {
	return leaf_node.server && event.request.method !== 'GET' && event.request.method !== 'HEAD';
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode['server']} server
 * @returns {Promise<Record<string,any> | void>}
 * @throws {Redirect | ValidationError | HttpError | Error}
 */
export async function handle_action_request(event, server) {
	const handler = server.actions;

	if (!handler) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: ''
		});
		throw error(405, 'POST method not allowed. No actions exist for this page');
	}

	return await handler.call(null, event);
}

/**
 * @param {import('types').SSRNode['server']} server
 */
function maybe_throw_migration_error(server) {
	for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
		if (/** @type {any} */ (server)[method]) {
			throw new Error(`${method} method no longer allowed in +page.server, use actions instead.`);
		}
	}
}
