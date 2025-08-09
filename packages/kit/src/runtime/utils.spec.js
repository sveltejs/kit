import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import { base64_decode, base64_encode } from './utils.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
];

const text_encoder = new TextEncoder();

const buffer = globalThis.Buffer;
beforeEach(() => {
	// @ts-expect-error
	delete globalThis.Buffer;
});
afterEach(() => {
	globalThis.Buffer = buffer;
});

describe('base64_encode', () => {
	test.each(inputs)('%s', (input) => {
		const expected = buffer.from(input).toString('base64');

		const actual = base64_encode(text_encoder.encode(input));
		assert.equal(actual, expected);
	});

	test.each(inputs)('(omitPadding) %s', (input) => {
		const expected = buffer.from(input).toString('base64').replace(/=+$/, '');

		const actual = base64_encode(text_encoder.encode(input), { omitPadding: true });
		assert.equal(actual, expected);
	});

	test.each(inputs)('(url) %s', (input) => {
		const expected = buffer.from(input).toString('base64url');

		const actual = base64_encode(text_encoder.encode(input), {
			alphabet: 'base64url',
			omitPadding: true
		});
		assert.equal(actual, expected);
	});
});

describe('base64_decode', () => {
	test.each(inputs)('%s', (input) => {
		const encoded = buffer.from(input).toString('base64');

		const actual = base64_decode(encoded);
		expect(actual).toEqual(text_encoder.encode(input));
	});

	test.each(inputs)('(url) %s', (input) => {
		const encoded = buffer.from(input).toString('base64url');

		const actual = base64_decode(encoded, { alphabet: 'base64url' });

		expect(actual).toEqual(text_encoder.encode(input));
	});
});
