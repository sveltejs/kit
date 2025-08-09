import { assert, describe, expect, test } from 'vitest';

/** @type {typeof import('./utils.js')} */
let module;

// Hack to pretend Buffer isn't available, to test the fallback implementation
if ('Buffer' in globalThis) {
	const _buffer = globalThis.Buffer;
	// @ts-expect-error
	delete globalThis.Buffer;
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	module = require('./utils.js');
	globalThis.Buffer = _buffer;
} else {
	module = await import('./utils.js');
}
const { base64_decode, base64_encode } = module;

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
];

const text_encoder = new TextEncoder();

describe('base64_encode', () => {
	test.each(inputs)('%s', (input) => {
		const expected = Buffer.from(input).toString('base64');

		const actual = base64_encode(text_encoder.encode(input));
		assert.equal(actual, expected);
	});

	test.each(inputs)('(omitPadding) %s', (input) => {
		const expected = Buffer.from(input).toString('base64').replace(/=+$/, '');

		const actual = base64_encode(text_encoder.encode(input), { omitPadding: true });
		assert.equal(actual, expected);
	});

	test.each(inputs)('(url) %s', (input) => {
		const expected = Buffer.from(input).toString('base64url');

		const actual = base64_encode(text_encoder.encode(input), {
			alphabet: 'base64url',
			omitPadding: true
		});
		assert.equal(actual, expected);
	});
});

describe('base64_decode', () => {
	test.each(inputs)('%s', (input) => {
		const encoded = Buffer.from(input).toString('base64');

		const actual = base64_decode(encoded);
		expect(actual).toEqual(text_encoder.encode(input));
	});

	test.each(inputs)('(url) %s', (input) => {
		const encoded = Buffer.from(input).toString('base64url');

		const actual = base64_decode(encoded, { alphabet: 'base64url' });

		expect(actual).toEqual(text_encoder.encode(input));
	});
});
