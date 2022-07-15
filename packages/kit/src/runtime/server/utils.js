/** @param {Record<string, any>} obj */
export function lowercase_keys(obj) {
	/** @type {Record<string, any>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}

/** @param {Record<string, string>} params */
export function decode_params(params) {
	for (const key in params) {
		// input has already been decoded by decodeURI
		// now handle the rest that decodeURIComponent would do
		params[key] = params[key]
			.replace(/%23/g, '#')
			.replace(/%3[Bb]/g, ';')
			.replace(/%2[Cc]/g, ',')
			.replace(/%2[Ff]/g, '/')
			.replace(/%3[Ff]/g, '?')
			.replace(/%3[Aa]/g, ':')
			.replace(/%40/g, '@')
			.replace(/%26/g, '&')
			.replace(/%3[Dd]/g, '=')
			.replace(/%2[Bb]/g, '+')
			.replace(/%24/g, '$');
	}

	return params;
}

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
 * Serialize an error into a JSON string, by copying its `name`, `message`
 * and (in dev) `stack`, plus any custom properties, plus recursively
 * serialized `cause` properties. This is necessary because
 * `JSON.stringify(error) === '{}'`
 * @param {Error} error
 * @param {(error: Error) => string | undefined} get_stack
 */
export function serialize_error(error, get_stack) {
	return JSON.stringify(clone_error(error, get_stack));
}

/**
 * @param {Error} error
 * @param {(error: Error) => string | undefined} get_stack
 */
function clone_error(error, get_stack) {
	const {
		name,
		message,
		// this should constitute 'using' a var, since it affects `custom`
		// eslint-disable-next-line
		stack,
		// @ts-expect-error i guess typescript doesn't know about error.cause yet
		cause,
		...custom
	} = error;

	/** @type {Record<string, any>} */
	const object = { name, message, stack: get_stack(error) };

	if (cause) object.cause = clone_error(cause, get_stack);

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
			throw Error(`Endpoint method "${m}" has changed to "${replacement}"`);
		}
	});
}

/** @type {import('types').SSRErrorPage} */
export const GENERIC_ERROR = {
	id: '__error'
};
