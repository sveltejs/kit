import { assert, test } from 'vitest';
import { hash, hash_request } from './hash.js';

/**
 * The one-character-per-iteration implementation, which every value must keep matching
 * @param {string[]} values
 */
function reference(...values) {
	let hash = 5381;
	for (const value of values) {
		let i = value.length;
		while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
	}
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
 * Random UTF-16 code units, including lone surrogates and astral characters
 * @param {() => number} next
 * @param {number} length
 */
function random_string(next, length) {
	let value = '';
	while (value.length < length) {
		const kind = next();
		if (kind < 0.5) value += String.fromCharCode(32 + Math.floor(next() * 95));
		else if (kind < 0.8) value += String.fromCharCode(Math.floor(next() * 0x10000));
		else value += String.fromCodePoint(0x10000 + Math.floor(next() * 0x100000));
	}
	return value.slice(0, length);
}

test('produces the same values as before', () => {
	assert.equal(hash(''), '45h');
	assert.equal(hash('a'), '3t1g');
	assert.equal(hash('abcd'), 'yirp35');
	assert.equal(hash('abcde'), '2qcww4');
	assert.equal(hash('hello world'), '17a12yt');
	assert.equal(hash('😀 é中'), '1wzvffg');
	assert.equal(hash('\udc00\ud800'), '35rnp');
	assert.equal(hash('x'.repeat(1000) + '￿'), '1ntqiqi');
	assert.equal(hash('foo', new Uint8Array([1, 2, 3]), 'bar'), '57whe');
	assert.equal(hash_request({ accept: 'application/json' }, 'body'), '17u206s');
});

test('matches the reference implementation for strings of every length', () => {
	const next = random(1);

	for (let length = 0; length <= 64; length += 1) {
		for (let i = 0; i < 200; i += 1) {
			const value = random_string(next, length);
			assert.equal(hash(value), reference(value), JSON.stringify(value));
		}
	}

	for (const length of [1_000, 65_537, 1_000_003]) {
		const value = random_string(next, length);
		assert.equal(hash(value), reference(value));
	}
});

test('matches the reference implementation for several values and concatenated strings', () => {
	const next = random(2);

	for (let i = 0; i < 200; i += 1) {
		const a = random_string(next, Math.floor(next() * 64));
		const b = random_string(next, Math.floor(next() * 64));
		assert.equal(hash(a, b), reference(a, b));
		assert.equal(hash(a + b), reference(a + b));
	}
});
