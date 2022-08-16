import { HttpError } from '../../index/private.js';

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

/**
 * Serialize an error into a JSON string through `error_to_pojo`.
 * This is necessary because `JSON.stringify(error) === '{}'`
 *
 * @param {Error | HttpError} error
 * @param {(error: Error) => string | undefined} get_stack
 */
export function serialize_error(error, get_stack) {
	return JSON.stringify(error_to_pojo(error, get_stack));
}

/**
 * Transform an error into a POJO, by copying its `name`, `message`
 * and (in dev) `stack`, plus any custom properties, plus recursively
 * serialized `cause` properties.
 * Our own HttpError gets a meta property attached so we can identify it on the client.
 *
 * @param {HttpError | Error } error
 * @param {(error: Error) => string | undefined} get_stack
 */
export function error_to_pojo(error, get_stack) {
	if (error instanceof HttpError) {
		return /** @type {import('./page/types').SerializedHttpError} */ ({
			message: error.message,
			status: error.status,
			__is_http_error: true // TODO we should probably make this unnecessary
		});
	}

	const {
		name,
		message,
		stack,
		// @ts-expect-error i guess typescript doesn't know about error.cause yet
		cause,
		...custom
	} = error;

	/** @type {Record<string, any>} */
	const object = { name, message, stack: get_stack(error) };

	if (cause) object.cause = error_to_pojo(cause, get_stack);

	for (const key in custom) {
		// @ts-expect-error
		object[key] = custom[key];
	}

	return object;
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
