const little_endian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/**
 * djb2 over the bytes read four at a time as little-endian 32-bit words, so every platform
 * computes the same value
 * @param {Uint8Array} bytes
 */
export function hash_bytes(bytes) {
	let hash = 5381;
	const words = bytes.byteLength >> 2;

	if (little_endian && bytes.byteOffset % 4 === 0) {
		const view = new Int32Array(bytes.buffer, bytes.byteOffset, words);
		for (let i = 0; i < words; i += 1) hash = Math.imul(hash, 33) ^ view[i];
	} else {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		for (let i = 0; i < words; i += 1) hash = Math.imul(hash, 33) ^ view.getInt32(i * 4, true);
	}

	for (let i = words * 4; i < bytes.byteLength; i += 1) hash = Math.imul(hash, 33) ^ bytes[i];

	return (hash >>> 0).toString(36);
}
