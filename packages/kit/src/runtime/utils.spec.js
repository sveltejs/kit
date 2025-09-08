import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import { base64_decode, base64_encode, convert_formdata, text_encoder } from './utils.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
];

const buffer = globalThis.Buffer;

describe('base64_encode', () => {
	beforeEach(() => {
		// @ts-expect-error
		delete globalThis.Buffer;
	});

	afterEach(() => {
		globalThis.Buffer = buffer;
	});

	test.each(inputs)('%s', (input) => {
		const expected = buffer.from(input).toString('base64');

		const actual = base64_encode(text_encoder.encode(input));
		assert.equal(actual, expected);
	});
});

describe('base64_decode', () => {
	beforeEach(() => {
		// @ts-expect-error
		delete globalThis.Buffer;
	});

	afterEach(() => {
		globalThis.Buffer = buffer;
	});

	test.each(inputs)('%s', (input) => {
		const encoded = buffer.from(input).toString('base64');

		const actual = base64_decode(encoded);
		expect(actual).toEqual(text_encoder.encode(input));
	});
});

describe('convert_formdata', () => {
	test('converts a FormData object', () => {
		const data = new FormData();

		data.append('foo', 'foo');

		data.append('array[]', 'a');
		data.append('array[]', 'b');
		data.append('array[]', 'c');

		const converted = convert_formdata(data);

		expect(converted).toEqual({
			foo: 'foo',
			array: ['a', 'b', 'c']
		});
	});
});
