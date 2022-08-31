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
	const actions = server.actions;

	if (!actions) {
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
		const result = await call_action(event, actions);
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
	const actions = server.actions;

	if (!actions) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: ''
		});
		throw error(405, 'POST method not allowed. No actions exist for this page');
	}

	return call_action(event, actions);
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
		throw param;
		if (param[0].startsWith('/')) {
			name = param[0].slice(1);
			break;
		}
	}

	const action = actions[name];
	if (!action) {
		throw new Error(`No action with name '${name}' found`);
	}

	if (event.request.headers.get('content-type') === 'application/json') {
		throw new Error('Actions expect form-encoded data, JSON is not supported');
	}

	const form = await event.request.formData();
	const fields = new FormData();
	const files = new FilesFormData();
	for (const [key, value] of form) {
		if (typeof value === 'string') {
			fields.append(key, value);
		} else {
			files.append(key, value);
		}
	}

	return action({ ...event, fields, files });
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

/** @typedef {import('types').FilesFormData}  FFD */

/** @implements {FFD} */
export class FilesFormData extends Map {
	constructor() {
		super([]);
	}
	// @ts-ignore
	set(key, file) {
		super.set(key, [file]);
	}
	// @ts-ignore
	get(key) {
		return super.get(key)[0];
	}
	// @ts-ignore
	append(key, value) {
		const files = super.get(key) || [];
		files.push(value);
		super.set(key, files);
	}
	// @ts-ignore
	getAll(key) {
		return super.get(key) || [];
	}
	// @ts-ignore
	forEach(callback) {
		super.forEach((value, key) => callback(value, key, this));
	}
	// TODO iteration is wrong because FormData returns entries with multiple values each as a [key, value] pair
}
