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

/** @param {any} obj **/
function is_readable_node_stream(obj) {
	// Copied from nodejs sources
	return !!(
		(
			obj &&
			typeof obj.pipe === 'function' &&
			typeof obj.on === 'function' &&
			(!obj._writableState || obj._readableState?.readable !== false) && // Duplex
			(!obj._writableState || obj._readableState)
		) // Writable has .pipe.
	);
}

/** @param {any} body */
export function is_pojo(body) {
	if (typeof body !== 'object') return false;

	if (body) {
		if (body instanceof Uint8Array) return false;

		if (is_readable_node_stream(body)) return false;

		// similarly, it could be a web ReadableStream
		if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return false;
	}

	return true;
}
/**
 * @param {import('types/hooks').RequestEvent} event
 * @returns string
 */
export function normalize_request_method(event) {
	const method = event.request.method.toLowerCase();
	return method === 'delete' ? 'del' : method; // 'delete' is a reserved word
}
