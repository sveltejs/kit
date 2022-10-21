import * as devalue from 'devalue';
import { DATA_SUFFIX } from '../../constants.js';
import { negotiate } from '../../utils/http.js';
import { HttpError } from '../control.js';

/** @param {any} body */
export function is_pojo(body) {
	if (typeof body !== 'object') return false;

	if (body) {
		if (body instanceof Uint8Array) return false;
		if (body instanceof ReadableStream) return false;

		// if body is a node Readable, throw an error
		// TODO remove this for 1.0
		if (body._readableState && typeof body.pipe === 'function') {
			throw new Error('Node streams are no longer supported — use a ReadableStream instead');
		}
	}

	return true;
}

// TODO: Remove for 1.0
/** @param {Record<string, any>} mod */
export function check_method_names(mod) {
	['get', 'post', 'put', 'patch', 'del'].forEach((m) => {
		if (m in mod) {
			const replacement = m === 'del' ? 'DELETE' : m.toUpperCase();
			throw Error(
				`Endpoint method "${m}" has changed to "${replacement}". See https://github.com/sveltejs/kit/discussions/5359 for more information.`
			);
		}
	});
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
	return new Response(`${method} method not allowed`, {
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
 * @param {any} data
 * @param {import('types').RequestEvent} event
 */
export function data_response(data, event) {
	const headers = {
		'content-type': 'application/json',
		'cache-control': 'private, no-store'
	};

	try {
		return new Response(devalue.stringify(data), { headers });
	} catch (e) {
		const error = /** @type {any} */ (e);
		const match = /\[(\d+)\]\.data\.(.+)/.exec(error.path);
		const message = match
			? `Data returned from \`load\` while rendering ${event.routeId} is not serializable: ${error.message} (data.${match[2]})`
			: error.message;
		return new Response(JSON.stringify(message), { headers, status: 500 });
	}
}

/**
 * @template {'prerender' | 'ssr' | 'csr'} Option
 * @template {Option extends 'prerender' ? import('types').PrerenderOption : boolean} Value
 *
 * @param {Array<import('types').SSRNode | undefined>} nodes
 * @param {Option} option
 *
 * @returns {Value | undefined}
 */
export function get_option(nodes, option) {
	return nodes.reduce((value, node) => {
		// TODO remove for 1.0
		for (const thing of [node?.server, node?.shared]) {
			if (thing && ('router' in thing || 'hydrate' in thing)) {
				throw new Error(
					'`export const hydrate` and `export const router` have been replaced with `export const csr`. See https://github.com/sveltejs/kit/pull/6446'
				);
			}
		}

		return /** @type {any} TypeScript's too dumb to understand this */ (
			node?.shared?.[option] ?? node?.server?.[option] ?? value
		);
	}, /** @type {Value | undefined} */ (undefined));
}

/**
 * Return as a response that renders the error.html
 *
 * @param {import('types').SSROptions} options
 * @param {number} status
 * @param {string} message
 */
export function static_error_page(options, status, message) {
	return new Response(options.error_template({ status, message }), {
		headers: { 'content-type': 'text/html; charset=utf-8' },
		status
	});
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {Error | HttpError} error
 */
export function handle_fatal_error(event, options, error) {
	const status = error instanceof HttpError ? error.status : 500;
	const body = handle_error_and_jsonify(event, options, error);

	// ideally we'd use sec-fetch-dest instead, but Safari — quelle surprise — doesn't support it
	const type = negotiate(event.request.headers.get('accept') || 'text/html', [
		'application/json',
		'text/html'
	]);

	if (event.url.pathname.endsWith(DATA_SUFFIX) || type === 'application/json') {
		return new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json; charset=utf-8' }
		});
	}

	return static_error_page(options, status, body.message);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {any} error
 * @returns {App.Error}
 */
export function handle_error_and_jsonify(event, options, error) {
	if (error instanceof HttpError) {
		return error.body;
	} else {
		return options.handle_error(error, event);
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
