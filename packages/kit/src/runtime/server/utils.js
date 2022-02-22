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
		if (body instanceof Error) return false;

		// body could be a node Readable, but we don't want to import
		// node built-ins, so we use duck typing
		if (body._readableState && typeof body.pipe === 'function') return false;

		// similarly, it could be a web ReadableStream
		if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return false;
	}

	return true;
}
/**
 * @param {import('types').RequestEvent} event
 * @returns string
 */
export function normalize_request_method(event) {
	const method = event.request.method.toLowerCase();
	return method === 'delete' ? 'del' : method; // 'delete' is a reserved word
}

export function enumerate_error_props(error) {
	const seen = new Set();

	return (function loop(error) {
		if (seen.has(error)) return error;
		seen.add(error);
		const { name, message, stack } = error;
		const obj = { ...error, name, message, stack };
		for (const [key, val] of Object.entries(obj)) {
			if (val instanceof Error) {
				obj[key] = loop(val);
			}
		}
		return obj;
	})(error);
}

// Something like https://github.com/moll/json-stringify-safe
export function stringify_safe(obj) {
	const stack = [];
	const keys = [];
	const cycleReplacer = function (key, value) {
		if (stack[0] === value) return '[Circular ~]';
		return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
	};

	return JSON.stringify(obj, function (key, value) {
		if (stack.length > 0) {
			const thisPos = stack.indexOf(this);
			~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
			~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
			if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
		} else stack.push(value);

		return value;
	});
}
