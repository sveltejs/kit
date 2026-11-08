const little_endian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/**
 * MurmurHash3 (x86, 32-bit, seed 0) over the bytes, read as little-endian 32-bit words so every
 * platform computes the same value
 * @param {Uint8Array} bytes
 */
export function hash_bytes(bytes) {
	let hash = 0;
	const length = bytes.byteLength;
	const words = length >> 2;

	if (little_endian && bytes.byteOffset % 4 === 0) {
		const view = new Int32Array(bytes.buffer, bytes.byteOffset, words);
		for (let i = 0; i < words; i += 1) hash = mix(hash, view[i]);
	} else {
		const view = new DataView(bytes.buffer, bytes.byteOffset, length);
		for (let i = 0; i < words; i += 1) hash = mix(hash, view.getInt32(i * 4, true));
	}

	const rest = words * 4;
	let k = 0;
	switch (length & 3) {
		case 3:
			k ^= bytes[rest + 2] << 16;
		// fallthrough
		case 2:
			k ^= bytes[rest + 1] << 8;
		// fallthrough
		case 1:
			k ^= bytes[rest];
			k = Math.imul(k, 0xcc9e2d51);
			k = (k << 15) | (k >>> 17);
			hash ^= Math.imul(k, 0x1b873593);
	}

	hash ^= length;
	hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
	hash ^= hash >>> 16;

	return (hash >>> 0).toString(36);
}

/**
 * @param {number} hash
 * @param {number} word
 */
function mix(hash, word) {
	word = Math.imul(word, 0xcc9e2d51);
	word = (word << 15) | (word >>> 17);
	hash ^= Math.imul(word, 0x1b873593);
	hash = (hash << 13) | (hash >>> 19);
	return (Math.imul(hash, 5) + 0xe6546b64) | 0;
}
