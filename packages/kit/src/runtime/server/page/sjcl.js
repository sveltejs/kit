const encoder = new TextEncoder();

/** @param {Uint32Array} uint32array */
function swap_endianness(uint32array) {
	const uint8array = new Uint8Array(uint32array.buffer);

	for (let i = 0; i < uint8array.length; i += 4) {
		const a = uint8array[i + 0];
		const b = uint8array[i + 1];
		const c = uint8array[i + 2];
		const d = uint8array[i + 3];

		uint8array[i + 0] = d;
		uint8array[i + 1] = c;
		uint8array[i + 2] = b;
		uint8array[i + 3] = a;
	}

	return uint32array;
}

/** @param {string} str */
function to_bits(str) {
	const encoded = encoder.encode(str);
	const length = encoded.length * 8;

	const size = 512 * Math.ceil((length + 129) / 512);
	const bytes = new Uint8Array(size / 8);
	bytes.set(encoded);
	bytes[encoded.length] = 0b10000000;

	swap_endianness(new Uint32Array(bytes.buffer));

	const words = new Uint32Array(bytes.buffer);
	words[words.length - 2] = Math.floor(length / 0x100000000); // this will always be zero for us
	words[words.length - 1] = length;

	return words;
}

/**
 * The SHA-256 initialization vector, to be precomputed.
 */
const init = new Uint32Array(8);

/*
 * init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
 */

/**
 * The SHA-256 hash key, to be precomputed.
 */
const key = new Uint32Array(64);

/*
 * key:
 * [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
 * 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
 * 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
 * 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
 * 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
 * 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
 * 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
 * 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
 */

/**
 * Function to precompute _init and _key.
 */
function precompute() {
	/** @param {number} x */
	function frac(x) {
		return (x - Math.floor(x)) * 0x100000000;
	}

	let prime = 2;

	for (let i = 0; i < 64; prime++) {
		let is_prime = true;

		for (let factor = 2; factor * factor <= prime; factor++) {
			if (prime % factor === 0) {
				is_prime = false;

				break;
			}
		}

		if (is_prime) {
			if (i < 8) {
				init[i] = frac(prime ** (1 / 2));
			}

			key[i] = frac(prime ** (1 / 3));

			i++;
		}
	}
}

/**
 * Perform one cycle of SHA-256.
 * @param {Uint32Array} out
 * @param {Uint32Array} w one block of words.
 */
const block = (out, w) => {
	var tmp;
	var a;
	var b;

	let out0 = out[0];
	let out1 = out[1];
	let out2 = out[2];
	let out3 = out[3];
	let out4 = out[4];
	let out5 = out[5];
	let out6 = out[6];
	let out7 = out[7];

	/* Rationale for placement of |0 :
	 * If a value can overflow is original 32 bits by a factor of more than a few
	 * million (2^23 ish), there is a possibility that it might overflow the
	 * 53-bit mantissa and lose precision.
	 *
	 * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
	 * propagates around the loop, and on the hash state out[]. I don't believe
	 * that the clamps on out4 and on out0 are strictly necessary, but it's close
	 * (for out4 anyway), and better safe than sorry.
	 *
	 * The clamps on out[] are necessary for the output to be correct even in the
	 * common case and for short inputs.
	 */

	for (let i = 0; i < 64; i++) {
		// load up the input word for this round

		if (i < 16) {
			tmp = w[i];
		} else {
			a = w[(i + 1) & 15];

			b = w[(i + 14) & 15];

			tmp = w[i & 15] =
				(((a >>> 7) ^ (a >>> 18) ^ (a >>> 3) ^ (a << 25) ^ (a << 14)) +
					((b >>> 17) ^ (b >>> 19) ^ (b >>> 10) ^ (b << 15) ^ (b << 13)) +
					w[i & 15] +
					w[(i + 9) & 15]) |
				0;
		}

		tmp =
			tmp +
			out7 +
			((out4 >>> 6) ^ (out4 >>> 11) ^ (out4 >>> 25) ^ (out4 << 26) ^ (out4 << 21) ^ (out4 << 7)) +
			(out6 ^ (out4 & (out5 ^ out6))) +
			key[i]; // | 0;

		// shift register
		out7 = out6;
		out6 = out5;
		out5 = out4;

		out4 = (out3 + tmp) | 0;

		out3 = out2;
		out2 = out1;
		out1 = out0;

		out0 =
			(tmp +
				((out1 & out2) ^ (out3 & (out1 ^ out2))) +
				((out1 >>> 2) ^
					(out1 >>> 13) ^
					(out1 >>> 22) ^
					(out1 << 30) ^
					(out1 << 19) ^
					(out1 << 10))) |
			0;
	}

	out[0] = (out[0] + out0) | 0;
	out[1] = (out[1] + out1) | 0;
	out[2] = (out[2] + out2) | 0;
	out[3] = (out[3] + out3) | 0;
	out[4] = (out[4] + out4) | 0;
	out[5] = (out[5] + out5) | 0;
	out[6] = (out[6] + out6) | 0;
	out[7] = (out[7] + out7) | 0;
};

/** @param {string} data */
export function hash(data) {
	if (!key[0]) precompute();

	const out = init.slice(0);
	const array = to_bits(data);

	for (let i = 0; i < array.length; i += 16) {
		block(out, array.subarray(i, i + 16));
	}

	return out;
}
