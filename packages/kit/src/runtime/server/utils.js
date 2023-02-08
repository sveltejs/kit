import * as devalue from 'devalue';
import { json, text } from '../../exports/index.js';
import { coalesce_to_error } from '../../utils/error.js';
import { negotiate } from '../../utils/http.js';
import { HttpError } from '../control.js';
import { fix_stack_trace } from '../shared.js';

/** @param {any} body */
export function is_pojo(body) {
	if (typeof body !== 'object') return false;

	if (body) {
		if (body instanceof Uint8Array) return false;
		if (body instanceof ReadableStream) return false;
	}

	return true;
}

/** @type {import('types').SSRErrorPage} */
export const GENERIC_ERROR = {
	id: '__error'
};

/**
 * @param {Partial<Record<import('types').HttpMethod, any>>} mod
 * @param {import('types').HttpMethod} method
 */
export function method_not_allowed(mod, method) {
	return text(`${method} method not allowed`, {
		status: 405,
		headers: {
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: allowed_methods(mod).join(', ')
		}
	});
}

/** @param {Partial<Record<import('types').HttpMethod, any>>} mod */
export function allowed_methods(mod) {
	const allowed = [];

	for (const method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
		if (method in mod) allowed.push(method);
	}

	if (mod.GET || mod.HEAD) allowed.push('HEAD');

	return allowed;
}

/**
 * Return as a response that renders the error.html
 *
 * @param {import('types').SSROptions} options
 * @param {number} status
 * @param {string} message
 */
export function static_error_page(options, status, message) {
	return text(options.templates.error({ status, message }), {
		headers: { 'content-type': 'text/html; charset=utf-8' },
		status
	});
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {unknown} error
 */
export async function handle_fatal_error(event, options, error) {
	error = error instanceof HttpError ? error : coalesce_to_error(error);
	const status = error instanceof HttpError ? error.status : 500;
	const body = await handle_error_and_jsonify(event, options, error);

	// ideally we'd use sec-fetch-dest instead, but Safari — quelle surprise — doesn't support it
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
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {any} error
 * @returns {Promise<App.Error>}
 */
export async function handle_error_and_jsonify(event, options, error) {
	if (error instanceof HttpError) {
		return error.body;
	} else {
		if (__SVELTEKIT_DEV__) {
			error = new Proxy(error, {
				get: (target, property) => {
					if (property === 'stack') {
						return fix_stack_trace(target.stack);
					}

					return Reflect.get(target, property, target);
				}
			});
		}

		return (
			(await options.hooks.handleError({ error, event })) ?? {
				message: event.route.id != null ? 'Internal Error' : 'Not Found'
			}
		);
	}
}

/**
 * @param {number} status
 * @param {string} location
 */
export function redirect_response(status, location) {
	const response = new Response(undefined, {
		status,
		headers: { location }
	});
	return response;
}

/**
 * @param {import('types').RequestEvent} event
 * @param {Error & { path: string }} error
 */
export function clarify_devalue_error(event, error) {
	if (error.path) {
		return `Data returned from \`load\` while rendering ${event.route.id} is not serializable: ${error.message} (data${error.path})`;
	}

	if (error.path === '') {
		return `Data returned from \`load\` while rendering ${event.route.id} is not a plain object`;
	}

	// belt and braces — this should never happen
	return error.message;
}

/** @param {import('types').ServerDataNode | import('types').ServerDataSkippedNode | import('types').ServerErrorNode | null} node */
export function serialize_data_node(node) {
	if (!node) return 'null';

	if (node.type === 'error' || node.type === 'skip') {
		return JSON.stringify(node);
	}

	const stringified = devalue.stringify(node.data);

	const uses = [];

	if (node.uses.dependencies.size > 0) {
		uses.push(`"dependencies":${JSON.stringify(Array.from(node.uses.dependencies))}`);
	}

	if (node.uses.params.size > 0) {
		uses.push(`"params":${JSON.stringify(Array.from(node.uses.params))}`);
	}

	if (node.uses.parent) uses.push(`"parent":1`);
	if (node.uses.route) uses.push(`"route":1`);
	if (node.uses.url) uses.push(`"url":1`);

	return `{"type":"data","data":${stringified},"uses":{${uses.join(',')}}${
		node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ''
	}}`;
}
