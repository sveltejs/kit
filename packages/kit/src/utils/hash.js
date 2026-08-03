/**
 * Hash using djb2
 * @param {import('types').StrictBody[]} values
 */
export function hash(...values) {
	let hash = 5381;

	for (const value of values) {
		if (typeof value === 'string') {
			let i = value.length;
			while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
		} else if (ArrayBuffer.isView(value)) {
			const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
			let i = buffer.length;
			while (i) hash = (hash * 33) ^ buffer[--i];
		} else {
			throw new TypeError('value must be a string or TypedArray');
		}
	}

	return (hash >>> 0).toString(36);
}

/**
 * Hash of the headers and body a `fetch` was called with. The server-side serializer and the
 * client-side cache lookup must produce identical values for cached responses to be found.
 * @param {HeadersInit | undefined} headers
 * @param {import('types').StrictBody | null | undefined} body
 */
export function hash_request(headers, body) {
	/** @type {import('types').StrictBody[]} */
	const values = [];

	if (headers) {
		values.push([...new Headers(headers)].join(','));
	}

	if (body) {
		values.push(body);
	}

	return hash(...values);
}
