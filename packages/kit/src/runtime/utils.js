/**
 * Like node's path.relative, but without using node
 * @param {string} from
 * @param {string} to
 */
export function get_relative_path(from, to) {
	const from_parts = from.split(/[/\\]/);
	const to_parts = to.split(/[/\\]/);
	from_parts.pop(); // get dirname

	while (from_parts[0] === to_parts[0]) {
		from_parts.shift();
		to_parts.shift();
	}

	let i = from_parts.length;
	while (i--) from_parts[i] = '..';

	return from_parts.concat(to_parts).join('/');
}

/**
 * @param {string} encoded
 * @param {{ alphabet?: 'base64' | 'base64url' }=} options
 * @returns {Uint8Array}
 */
export function base64_decode(encoded, options) {
	if ('fromBase64' in Uint8Array) {
		// @ts-expect-error - https://github.com/microsoft/TypeScript/pull/61696
		return Uint8Array.fromBase64(encoded, options);
	}
	if ('Buffer' in globalThis) {
		const buffer = Buffer.from(encoded, options?.alphabet === 'base64url' ? 'base64url' : 'base64');
		return new Uint8Array(buffer);
	}

	const decode_map = options?.alphabet === 'base64url' ? b64_url_decode_map : b64_decode_map;

	const result = new Uint8Array(Math.ceil(encoded.length / 4) * 3);
	let total_bytes = 0;
	for (let i = 0; i < encoded.length; i += 4) {
		let chunk = 0;
		let bits_read = 0;
		for (let j = 0; j < 4; j++) {
			const char = encoded[i + j];
			if (i + j >= encoded.length || char === '=') {
				continue;
			}
			if (j > 0 && encoded[i + j - 1] === '=') {
				throw new Error('Invalid padding');
			}
			if (!(char in decode_map)) {
				throw new Error('Invalid character');
			}
			chunk |= decode_map[/** @type {keyof typeof decode_map} */ (char)] << ((3 - j) * 6);
			bits_read += 6;
		}
		if (bits_read < 24) {
			/** @type {number} */
			let unused;
			if (bits_read === 12) {
				unused = chunk & 0xffff;
			} else if (bits_read === 18) {
				unused = chunk & 0xff;
			} else {
				throw new Error('Invalid padding');
			}
			if (unused !== 0) {
				throw new Error('Invalid padding');
			}
		}
		const byte_length = Math.floor(bits_read / 8);
		for (let i = 0; i < byte_length; i++) {
			result[total_bytes] = (chunk >> (16 - i * 8)) & 0xff;
			total_bytes++;
		}
	}
	return result.slice(0, total_bytes);
}

/**
 * @param {Uint8Array} bytes
 * @param {{ alphabet?: 'base64' | 'base64url', omitPadding?: boolean }=} options
 * @returns {string}
 */
export function base64_encode(bytes, options) {
	if ('toBase64' in Uint8Array.prototype) {
		// @ts-expect-error - https://github.com/microsoft/TypeScript/pull/61696
		return bytes.toBase64(options);
	}
	if ('Buffer' in globalThis) {
		const buffer = Buffer.from(bytes.buffer);
		const encoded = buffer.toString(options?.alphabet === 'base64url' ? 'base64url' : 'base64');
		if (options?.omitPadding) {
			return encoded.replace(/=+$/, '');
		}
		return encoded;
	}

	const alphabet = options?.alphabet === 'base64url' ? b64_url_alphabet : b64_alphabet;
	const omit_padding = options?.omitPadding ?? false;

	let result = '';
	for (let i = 0; i < bytes.byteLength; i += 3) {
		let buffer = 0;
		let buffer_bit_size = 0;
		for (let j = 0; j < 3 && i + j < bytes.byteLength; j++) {
			buffer = (buffer << 8) | bytes[i + j];
			buffer_bit_size += 8;
		}
		for (let j = 0; j < 4; j++) {
			if (buffer_bit_size >= 6) {
				result += alphabet[(buffer >> (buffer_bit_size - 6)) & 0x3f];
				buffer_bit_size -= 6;
			} else if (buffer_bit_size > 0) {
				result += alphabet[(buffer << (6 - buffer_bit_size)) & 0x3f];
				buffer_bit_size = 0;
			} else if (!omit_padding) {
				result += '=';
			}
		}
	}
	return result;
}

const b64_alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64_url_alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const b64_decode_map = {
	0: 52,
	1: 53,
	2: 54,
	3: 55,
	4: 56,
	5: 57,
	6: 58,
	7: 59,
	8: 60,
	9: 61,
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	E: 4,
	F: 5,
	G: 6,
	H: 7,
	I: 8,
	J: 9,
	K: 10,
	L: 11,
	M: 12,
	N: 13,
	O: 14,
	P: 15,
	Q: 16,
	R: 17,
	S: 18,
	T: 19,
	U: 20,
	V: 21,
	W: 22,
	X: 23,
	Y: 24,
	Z: 25,
	a: 26,
	b: 27,
	c: 28,
	d: 29,
	e: 30,
	f: 31,
	g: 32,
	h: 33,
	i: 34,
	j: 35,
	k: 36,
	l: 37,
	m: 38,
	n: 39,
	o: 40,
	p: 41,
	q: 42,
	r: 43,
	s: 44,
	t: 45,
	u: 46,
	v: 47,
	w: 48,
	x: 49,
	y: 50,
	z: 51,
	'+': 62,
	'/': 63
};

const b64_url_decode_map = { ...b64_decode_map, '-': 62, _: 63 };

/**
	Base64 functions based on https://github.com/oslo-project/encoding/blob/main/src/base64.ts 

	MIT License
	Copyright (c) 2024 pilcrowOnPaper

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
 */
