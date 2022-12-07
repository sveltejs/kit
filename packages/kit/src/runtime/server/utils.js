import * as devalue from 'devalue';
import { coalesce_to_error } from '../../utils/error.js';
import { negotiate } from '../../utils/http.js';
import { has_data_suffix } from '../../utils/url.js';
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
 * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
 * @template {Option extends 'prerender' ? import('types').PrerenderOption : Option extends 'trailingSlash' ? import('types').TrailingSlash : boolean} Value
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

	if (has_data_suffix(event.url.pathname) || type === 'application/json') {
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
 * @returns {import('types').MaybePromise<App.Error>}
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
