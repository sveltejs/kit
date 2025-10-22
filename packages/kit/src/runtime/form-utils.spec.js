import { describe, expect, test } from 'vitest';
import {
	BINARY_FORM_CONTENT_TYPE,
	convert_formdata,
	deserialize_binary_form,
	serialize_binary_form,
	split_path
} from './form-utils.js';
import { text_decoder } from './utils.js';

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

	const pollution_attacks = [
		'__proto__.polluted',
		'constructor.polluted',
		'prototype.polluted',
		'user.__proto__.polluted',
		'user.constructor.polluted'
	];

	for (const attack of pollution_attacks) {
		test(`prevents prototype pollution: ${attack}`, () => {
			const data = new FormData();
			data.append(attack, 'bad');
			expect(() => convert_formdata(data)).toThrow(/Invalid key "/);
		});
	}
});

describe('binary form serializer', () => {
	test.each([
		{
			data: {},
			meta: {}
		},
		{
			data: { foo: 'foo', nested: { prop: 'prop' } },
			meta: { pathname: '/foo', validate_only: true }
		}
	])('simple', async (input) => {
		const { blob } = serialize_binary_form(input.data, input.meta);
		const res = await deserialize_binary_form(
			new Request('http://test', {
				method: 'POST',
				body: blob,
				headers: {
					'Content-Type': BINARY_FORM_CONTENT_TYPE
				}
			})
		);
		expect(res.form_data).toBeNull();
		expect(res.data).toEqual(input.data);
		expect(res.meta).toEqual(input.meta ?? {});
	});
	test('file uploads', async () => {
		const { blob } = serialize_binary_form(
			{
				small: new File(['a'], 'a.txt', { type: 'text/plain' }),
				large: new File([new Uint8Array(1024).fill('a'.charCodeAt(0))], 'large.txt', {
					type: 'text/plain',
					lastModified: 100
				})
			},
			{}
		);
		// Split the stream into 1 byte chunks to make sure all the chunking deserialization works
		const stream = blob.stream().pipeThrough(
			new TransformStream({
				transform(chunk, controller) {
					for (const byte of chunk) {
						controller.enqueue(new Uint8Array([byte]));
					}
				}
			})
		);
		const res = await deserialize_binary_form(
			new Request('http://test', {
				method: 'POST',
				body: stream,
				// @ts-expect-error duplex required in node
				duplex: 'half',
				headers: {
					'Content-Type': BINARY_FORM_CONTENT_TYPE
				}
			})
		);
		const { small, large } = res.data;
		expect(small.name).toBe('a.txt');
		expect(small.type).toBe('text/plain');
		expect(small.size).toBe(1);
		expect(await small.text()).toBe('a');

		expect(large.name).toBe('large.txt');
		expect(large.type).toBe('text/plain');
		expect(large.size).toBe(1024);
		expect(large.lastModified).toBe(100);
		const buffer = new Uint8Array(large.size);
		let cursor = 0;
		for await (const chunk of large.stream()) {
			buffer.set(chunk, cursor);
			cursor += chunk.byteLength;
		}
		expect(buffer).toEqual(new Uint8Array(1024).fill('a'.charCodeAt(0)));
		// text should be callable after stream is consumed
		expect(await large.text()).toBe('a'.repeat(1024));
	});
});
