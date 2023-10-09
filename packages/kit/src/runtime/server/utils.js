import { DEV } from 'esm-env';
import { json, text } from '../../exports/index.js';
import { coalesce_to_error } from '../../utils/error.js';
import { negotiate } from '../../utils/http.js';
import { HttpError } from '../control.js';
import { fix_stack_trace } from '../shared-server.js';
import { ENDPOINT_METHODS } from '../../constants.js';

/** @param {any} body */
export function is_pojo(body) {
	if (typeof body !== 'object') return false;

	if (body) {
		if (body instanceof Uint8Array) return false;
		if (body instanceof ReadableStream) return false;
	}

	return true;
}

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
	const allowed = Array.from(ENDPOINT_METHODS).filter((method) => method in mod);

	if ('GET' in mod || 'HEAD' in mod) allowed.push('HEAD');

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
	let page = options.templates.error({ status, message });

	if (DEV) {
		// inject Vite HMR client, for easier debugging
		page = page.replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
	}

	return text(page, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
		status
	});
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {unknown} error
 */
export async function handle_fatal_error(event, options, error) {
	error = error instanceof HttpError ? error : coalesce_to_error(error);
	const status = error instanceof HttpError ? error.status : 500;
	const body = await handle_error_and_jsonify(event, options, error);

	// ideally we'd use sec-fetch-dest instead, but Safari — quelle surprise — doesn't support it
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
 * @param {import('types').SSROptions} options
 * @param {any} error
 * @returns {Promise<App.Error>}
 */
export async function handle_error_and_jsonify(event, options, error) {
	if (error instanceof HttpError) {
		return error.body;
	} else {
		if (__SVELTEKIT_DEV__ && typeof error == 'object') {
			fix_stack_trace(error);
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
 * @param {import('@sveltejs/kit').RequestEvent} event
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

/**
 * @param {import('types').ServerDataNode} node
 */
export function stringify_uses(node) {
	const uses = [];

	if (node.uses && node.uses.dependencies.size > 0) {
		uses.push(`"dependencies":${JSON.stringify(Array.from(node.uses.dependencies))}`);
	}

	if (node.uses && node.uses.params.size > 0) {
		uses.push(`"params":${JSON.stringify(Array.from(node.uses.params))}`);
	}

	if (node.uses?.parent) uses.push('"parent":1');
	if (node.uses?.route) uses.push('"route":1');
	if (node.uses?.url) uses.push('"url":1');

	return `"uses":{${uses.join(',')}}`;
}
