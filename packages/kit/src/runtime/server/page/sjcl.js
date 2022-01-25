export const sjcl = {
	hash: {}
};

/** @param {Uint32Array} uint32array' */
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
function toBits(str) {
	str = unescape(encodeURIComponent(str));

	var out = [],
		i,
		tmp = 0;

	for (i = 0; i < str.length; i++) {
		tmp = (tmp << 8) | str.charCodeAt(i);

		if ((i & 3) === 3) {
			out.push(tmp);

			tmp = 0;
		}
	}

	if (i & 3) {
		out.push(BitArray.partial(8 * (i & 3), tmp));
	}

	return out;
}

/**
 * Arrays of bits, encoded as arrays of Numbers.
 * @namespace
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */

/** @typedef {number[]} bitArray */

const BitArray = {
	/**
	 * Concatenate two bit arrays.
	 * @param {bitArray} a1 The first array.
	 * @param {bitArray} a2 The second array.
	 * @return {bitArray} The concatenation of a1 and a2.
	 */
	concat: function (a1, a2) {
		if (a1.length === 0 || a2.length === 0) {
			return a1.concat(a2);
		}

		var last = a1[a1.length - 1],
			shift = BitArray.getPartial(last);

		if (shift === 32) {
			return a1.concat(a2);
		} else {
			return BitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
		}
	},

	/**
	 * Find the length of an array of bits.
	 * @param {bitArray} a The array.
	 * @return {Number} The length of a, in bits.
	 */
	bitLength: function (a) {
		var l = a.length,
			x;

		if (l === 0) {
			return 0;
		}

		x = a[l - 1];

		return (l - 1) * 32 + BitArray.getPartial(x);
	},

	/**
	 * Make a partial word for a bit array.
	 * @param {Number} len The number of bits in the word.
	 * @param {Number} x The bits.
	 * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
	 * @return {Number} The partial word.
	 */
	partial: function (len, x, _end) {
		if (len === 32) {
			return x;
		}

		return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
	},

	/**
	 * Get the number of bits used by a partial word.
	 * @param {Number} x The partial word.
	 * @return {Number} The number of bits used by the partial word.
	 */
	getPartial: function (x) {
		return Math.round(x / 0x10000000000) || 32;
	},

	/** Shift an array right.
	 * @param {bitArray} a The array to shift.
	 * @param {number} shift The number of bits to shift.
	 * @param {number} [carry] A byte to carry in
	 * @param {bitArray} [out] An array to prepend to the output.
	 * @private
	 */
	_shiftRight: function (a, shift, carry = 0, out = []) {
		var i,
			last2 = 0,
			shift2;

		for (; shift >= 32; shift -= 32) {
			out.push(carry);

			carry = 0;
		}

		if (shift === 0) {
			return out.concat(a);
		}

		for (i = 0; i < a.length; i++) {
			out.push(carry | (a[i] >>> shift));

			carry = a[i] << (32 - shift);
		}

		last2 = a.length ? a[a.length - 1] : 0;

		shift2 = BitArray.getPartial(last2);

		out.push(BitArray.partial((shift + shift2) & 31, shift + shift2 > 32 ? carry : out.pop(), 1));

		return out;
	}
};

/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 */

sjcl.hash.sha256 = function (hash) {
	if (!this._key[0]) {
		this._precompute();
	}

	if (hash) {
		this._h = hash._h.slice(0);

		this._buffer = hash._buffer.slice(0);

		this._length = hash._length;
	} else {
		this.reset();
	}
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
	return new sjcl.hash.sha256().update(data).finalize();
};

sjcl.hash.sha256.prototype = {
	/**
	 * The hash's block size, in bits.
	 * @constant
	 */
	blockSize: 512,

	/**
	 * Reset the hash state.
	 * @return this
	 */
	reset: function () {
		this._h = this._init.slice(0);
		this._buffer = [];
		this._length = 0;
		return this;
	},

	/**
	 * Input several words to the hash.
	 * @param {bitArray|String} data the data to hash.
	 * @return this
	 */
	update: function (data) {
		if (typeof data === 'string') {
			data = toBits(data);
		}

		var i,
			b = (this._buffer = BitArray.concat(this._buffer, data)),
			ol = this._length,
			nl = (this._length = ol + BitArray.bitLength(data));

		if (nl > 9007199254740991) {
			throw new sjcl.exception.invalid('Cannot hash more than 2^53 - 1 bits');
		}

		if (typeof Uint32Array !== 'undefined') {
			var c = new Uint32Array(b);

			var j = 0;

			for (i = 512 + ol - ((512 + ol) & 511); i <= nl; i += 512) {
				this._block(c.subarray(16 * j, 16 * (j + 1)));

				j += 1;
			}

			b.splice(0, 16 * j);
		} else {
			for (i = 512 + ol - ((512 + ol) & 511); i <= nl; i += 512) {
				this._block(b.splice(0, 16));
			}
		}

		return this;
	},

	/**
	 * Complete hashing and output the hash value.
	 * @return {bitArray} The hash value, an array of 8 big-endian words.
	 */
	finalize: function () {
		var i,
			b = this._buffer,
			h = this._h;

		// Round out and push the buffer

		b = BitArray.concat(b, [BitArray.partial(1, 1)]);

		// Round out the buffer to a multiple of 16 words, less the 2 length words.

		for (i = b.length + 2; i & 15; i++) {
			b.push(0);
		}

		// append the length

		b.push(Math.floor(this._length / 0x100000000));

		b.push(this._length | 0);

		while (b.length) {
			this._block(b.splice(0, 16));
		}

		this.reset();

		return h;
	},

	/**
	 * The SHA-256 initialization vector, to be precomputed.
	 * @private
	 */
	_init: [],

	/*
	_init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
	*/

	/**
	 * The SHA-256 hash key, to be precomputed.
	 * @private
	 */
	_key: [],

	/*
	_key:
	  [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	   0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	   0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	   0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	   0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	   0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	   0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	   0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
	*/

	/**
	 * Function to precompute _init and _key.
	 * @private
	 */
	_precompute: function () {
		var i = 0,
			prime = 2,
			factor,
			isPrime;

		function frac(x) {
			return ((x - Math.floor(x)) * 0x100000000) | 0;
		}

		for (; i < 64; prime++) {
			isPrime = true;

			for (factor = 2; factor * factor <= prime; factor++) {
				if (prime % factor === 0) {
					isPrime = false;

					break;
				}
			}

			if (isPrime) {
				if (i < 8) {
					this._init[i] = frac(Math.pow(prime, 1 / 2));
				}

				this._key[i] = frac(Math.pow(prime, 1 / 3));

				i++;
			}
		}
	},

	/**
	 * Perform one cycle of SHA-256.
	 * @param {Uint32Array|bitArray} w one block of words.
	 * @private
	 */
	_block: function (w) {
		var i,
			tmp,
			a,
			b,
			h = this._h,
			k = this._key,
			h0 = h[0],
			h1 = h[1],
			h2 = h[2],
			h3 = h[3],
			h4 = h[4],
			h5 = h[5],
			h6 = h[6],
			h7 = h[7];

		/* Rationale for placement of |0 :
		 * If a value can overflow is original 32 bits by a factor of more than a few
		 * million (2^23 ish), there is a possibility that it might overflow the
		 * 53-bit mantissa and lose precision.
		 *
		 * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
		 * propagates around the loop, and on the hash state h[].  I don't believe
		 * that the clamps on h4 and on h0 are strictly necessary, but it's close
		 * (for h4 anyway), and better safe than sorry.
		 *
		 * The clamps on h[] are necessary for the output to be correct even in the
		 * common case and for short inputs.
		 */

		for (i = 0; i < 64; i++) {
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
				h7 +
				((h4 >>> 6) ^ (h4 >>> 11) ^ (h4 >>> 25) ^ (h4 << 26) ^ (h4 << 21) ^ (h4 << 7)) +
				(h6 ^ (h4 & (h5 ^ h6))) +
				k[i]; // | 0;

			// shift register

			h7 = h6;
			h6 = h5;
			h5 = h4;

			h4 = (h3 + tmp) | 0;

			h3 = h2;
			h2 = h1;
			h1 = h0;

			h0 =
				(tmp +
					((h1 & h2) ^ (h3 & (h1 ^ h2))) +
					((h1 >>> 2) ^ (h1 >>> 13) ^ (h1 >>> 22) ^ (h1 << 30) ^ (h1 << 19) ^ (h1 << 10))) |
				0;
		}

		h[0] = (h[0] + h0) | 0;
		h[1] = (h[1] + h1) | 0;
		h[2] = (h[2] + h2) | 0;
		h[3] = (h[3] + h3) | 0;
		h[4] = (h[4] + h4) | 0;
		h[5] = (h[5] + h5) | 0;
		h[6] = (h[6] + h6) | 0;
		h[7] = (h[7] + h7) | 0;
	}
};
