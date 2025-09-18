import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import {
	base64_decode,
	base64_encode,
	convert_formdata,
	split_path,
	text_encoder
} from './utils.js';

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

describe('split_path', () => {
	const good = [
		{
			input: 'foo',
			output: ['foo']
		},
		{
			input: 'foo.bar.baz',
			output: ['foo', 'bar', 'baz']
		},
		{
			input: 'foo[0][1][2]',
			output: ['foo', '0', '1', '2']
		}
	];

	const bad = ['[0]', 'foo.0', 'foo[bar]'];

	for (const { input, output } of good) {
		test(input, () => {
			expect(split_path(input)).toEqual(output);
		});
	}

	for (const input of bad) {
		test(input, () => {
			expect(() => split_path(input)).toThrowError(`Invalid path ${input}`);
		});
	}
});

describe('convert_formdata', () => {
	test('converts a FormData object', () => {
		const data = new FormData();

		data.append('foo', 'foo');

		data.append('object.nested.property', 'property');
		data.append('array[]', 'a');
		data.append('array[]', 'b');
		data.append('array[]', 'c');

		const converted = convert_formdata(data);

		expect(converted).toEqual({
			foo: 'foo',
			object: {
				nested: {
					property: 'property'
				}
			},
			array: ['a', 'b', 'c']
		});
	});

	test('handles multiple fields at the same nested level', () => {
		const data = new FormData();

		data.append('user.name.first', 'first');
		data.append('user.name.last', 'last');

		const converted = convert_formdata(data);

		expect(converted).toEqual({
			user: {
				name: {
					first: 'first',
					last: 'last'
				}
			}
		});
	});
});
