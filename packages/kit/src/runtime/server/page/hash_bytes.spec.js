import { assert, test } from 'vitest';
import { hash_bytes } from './hash_bytes.js';

/**
 * @param {number} x
 * @param {number} r
 */
const rotl = (x, r) => (x << r) | (x >>> (32 - r));

/**
 * MurmurHash3 x86_32 with seed 0, assembled byte by byte
 * @param {Uint8Array} bytes
 */
function reference(bytes) {
	let hash = 0;
	let i = 0;
	for (; i + 4 <= bytes.length; i += 4) {
		let k = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24);
		k = Math.imul(rotl(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593);
		hash = (Math.imul(rotl(hash ^ k, 13), 5) + 0xe6546b64) | 0;
	}
	let k = 0;
	for (let j = bytes.length - 1; j >= i; j -= 1) k = (k << 8) | bytes[j];
	if (i < bytes.length) hash ^= Math.imul(rotl(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593);
	hash ^= bytes.length;
	hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
	hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
	return ((hash ^ (hash >>> 16)) >>> 0).toString(36);
}

/** @param {number} seed */
function random(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * @param {() => number} next
 * @param {number} length
 */
function random_bytes(next, length) {
	const bytes = new Uint8Array(length);
	for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(next() * 256);
	return bytes;
}

test('hash_bytes produces known values', () => {
	const encoder = new TextEncoder();
	assert.equal(hash_bytes(new Uint8Array()), '0');
	assert.equal(hash_bytes(encoder.encode('hello')), (0x248bfa47).toString(36));
	assert.equal(
		hash_bytes(encoder.encode('The quick brown fox jumps over the lazy dog')),
		(0x2e4ff723).toString(36)
	);
});

test('hash_bytes matches the reference for every length', () => {
	const next = random(1);

	for (let length = 0; length <= 64; length += 1) {
		for (let i = 0; i < 100; i += 1) {
			const bytes = random_bytes(next, length);
			assert.equal(hash_bytes(bytes), reference(bytes));
		}
	}

	for (const length of [1_000, 65_537, 1_000_003]) {
		const bytes = random_bytes(next, length);
		assert.equal(hash_bytes(bytes), reference(bytes));
	}
});

test('hash_bytes does not depend on where the bytes sit in their buffer', () => {
	const next = random(2);

	for (let offset = 0; offset < 4; offset += 1) {
		for (const length of [0, 1, 3, 4, 5, 63, 1_001]) {
			const backing = random_bytes(next, length + offset);
			const view = backing.subarray(offset);
			assert.equal(hash_bytes(view), hash_bytes(view.slice()));
			assert.equal(hash_bytes(view), reference(view));
		}
	}
});

test('hash_bytes changes when two digits a few words apart change', () => {
	let html = '';
	for (let i = 0; i < 200; i += 1)
		html += `<tr><td>${1000 + i}</td><td>${(i * 37) % 10000}</td></tr>`;
	const bytes = new TextEncoder().encode(html);
	const original = hash_bytes(bytes);
	const next = random(4);

	for (let i = 0; i < 20_000; i += 1) {
		const a = Math.floor(next() * (bytes.length - 12));
		const b = a + 4 * (1 + Math.floor(next() * 3));
		const changed = bytes.slice();
		changed[a] ^= 1 + Math.floor(next() * 15);
		changed[b] ^= 1 + Math.floor(next() * 15);
		assert.notEqual(hash_bytes(changed), original);
	}
});
