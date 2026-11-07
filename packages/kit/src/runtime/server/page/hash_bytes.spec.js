import { assert, test } from 'vitest';
import { hash_bytes } from './hash_bytes.js';

/**
 * djb2 over little-endian 32-bit words, then the remaining bytes, assembled by hand
 * @param {Uint8Array} bytes
 */
function reference(bytes) {
	let hash = 5381;
	let i = 0;
	for (; i + 4 <= bytes.length; i += 4) {
		const word = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24);
		hash = Math.imul(hash, 33) ^ word;
	}
	for (; i < bytes.length; i += 1) hash = Math.imul(hash, 33) ^ bytes[i];
	return (hash >>> 0).toString(36);
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
	assert.equal(hash_bytes(new Uint8Array()), '45h');
	assert.equal(hash_bytes(encoder.encode('a')), reference(encoder.encode('a')));
	assert.equal(
		hash_bytes(encoder.encode('<!doctype html>')),
		reference(encoder.encode('<!doctype html>'))
	);
	assert.equal(hash_bytes(encoder.encode('😀 é中')), reference(encoder.encode('😀 é中')));
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

test('hash_bytes changes when any byte changes', () => {
	const bytes = random_bytes(random(3), 1_024);
	const original = hash_bytes(bytes);

	for (let i = 0; i < bytes.length; i += 1) {
		const changed = bytes.slice();
		changed[i] ^= 1;
		assert.notEqual(hash_bytes(changed), original);
	}
});
