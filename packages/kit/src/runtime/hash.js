/**
 * Hash using djb2
 * @param {import('types').StrictBody} value
 */
export function hash(value) {
	let hash = 5381;

	if (typeof value === 'string') {
		let i = value.length;
		while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
	} else if (value instanceof ArrayBuffer) {
		const buffer = new Uint8Array(value);
		let i = buffer.byteLength;
		while (i) hash = (hash * 33) ^ buffer[--i];
	} else if (ArrayBuffer.isView(value)) {
		const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
		let i = buffer.byteLength;
		while (i) hash = (hash * 33) ^ buffer[--i];
	} else {
		throw new TypeError('value must be a string, ArrayBuffer, DataView or TypedArray');
	}

	return (hash >>> 0).toString(36);
}

/**
 * @param {FormData} formData;
 */
export async function hash_formdata(formData) {
	const data = [];
	for (const [name, value] of formData.entries()) {
		data.push(name, typeof value === 'string' ? value : value.arrayBuffer());
	}
	return hash((await Promise.all(data)).map(hash).join(''));
}
