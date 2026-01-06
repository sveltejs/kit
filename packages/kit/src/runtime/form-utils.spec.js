import { beforeAll, describe, expect, test } from 'vitest';
import {
	BINARY_FORM_CONTENT_TYPE,
	convert_formdata,
	deep_set,
	deserialize_binary_form,
	serialize_binary_form,
	split_path
} from './form-utils.js';
import buffer from 'node:buffer';
import { text_encoder } from './utils.js';

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
	beforeAll(() => {
		// TODO: remove after dropping support for Node 18
		if (!('File' in globalThis)) {
			// @ts-ignore
			globalThis.File = buffer.File;
		}
	});
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
	test('LazyFile methods', async () => {
		const { blob } = serialize_binary_form(
			{
				file: new File(['Hello World'], 'a.txt')
			},
			{}
		);
		const res = await deserialize_binary_form(
			new Request('http://test', {
				method: 'POST',
				body: blob,
				headers: {
					'Content-Type': BINARY_FORM_CONTENT_TYPE
				}
			})
		);
		/** @type {File} */
		const file = res.data.file;
		const expected = text_encoder.encode('Hello World');
		expect(await file.text()).toBe('Hello World');
		expect(await file.arrayBuffer()).toEqual(expected.buffer);
		expect(await file.bytes()).toEqual(expected);
		expect(await new Response(file.stream()).arrayBuffer()).toEqual(expected.buffer);
		const ello_slice = file.slice(1, 5, 'test/content-type');
		expect(ello_slice.type).toBe('test/content-type');
		expect(await ello_slice.text()).toBe('ello');
		const world_slice = file.slice(-5);
		expect(await world_slice.text()).toBe('World');
		expect(world_slice.type).toBe(file.type);
	});

	// Regression test for https://github.com/sveltejs/kit/issues/14971
	test('DataView offset for shared memory', async () => {
		const { blob } = serialize_binary_form({ a: 1 }, {});
		const chunk = new Uint8Array(await blob.arrayBuffer());
		// Simulate a stream that has extra bytes at the start in the underlying buffer
		const stream = new ReadableStream({
			start(controller) {
				const offset_buffer = new Uint8Array(chunk.byteLength + 10);
				offset_buffer.fill(255);
				offset_buffer.set(chunk, 10);
				controller.enqueue(offset_buffer.subarray(10));
			}
		});

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

		expect(res.data).toEqual({ a: 1 });
	});
});

describe('deep_set', () => {
	test('always creates own property', () => {
		const target = {};

		deep_set(target, ['toString', 'property'], 'hello');

		// @ts-ignore
		expect(target.toString.property).toBe('hello');
		// @ts-ignore
		expect(Object.prototype.toString.property).toBeUndefined();
	});
});
