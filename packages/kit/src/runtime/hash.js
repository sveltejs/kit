/**
 * Hash using djb2
 * @param {import('types').StrictBody} value
 */
export function hash(value) {
	let hash = 5381;

	if (typeof value === 'string') {
		let i = value.length;
		while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
	} else if (ArrayBuffer.isView(value)) {
		const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
		let i = buffer.length;
		while (i) hash = (hash * 33) ^ buffer[--i];
	} else if (value instanceof FormData) {
		let i, entry_str;
		for (const entry of value.entries()) {
			entry_str = entry.toString();
			i = entry_str.length;
			while (i) hash = (hash * 33) ^ entry_str.charCodeAt(--i);
		}
	} else if (value instanceof URLSearchParams) {
		const search_str = value.toString();
		let i = search_str.length;
		while (i) hash = (hash * 33) ^ search_str.charCodeAt(--i);
	} else {
		throw new TypeError('value must be a string, TypedArray, FormData or URLSearchParams');
	}

	return (hash >>> 0).toString(36);
}
