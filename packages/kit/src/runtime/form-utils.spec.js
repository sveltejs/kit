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
					'Content-Type': BINARY_FORM_CONTENT_TYPE,
					'Content-Length': blob.size.toString()
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
				}),
				empty: new File([], 'empty.txt', { type: 'text/plain' })
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
					'Content-Type': BINARY_FORM_CONTENT_TYPE,
					'Content-Length': blob.size.toString()
				}
			})
		);
		const { small, large, empty } = res.data;
		expect(empty.name).toBe('empty.txt');
		expect(empty.type).toBe('text/plain');
		expect(empty.size).toBe(0);
		expect(await empty.text()).toBe('');
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
					'Content-Type': BINARY_FORM_CONTENT_TYPE,
					'Content-Length': blob.size.toString()
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

	test('throws when Content-Length is invalid', async () => {
		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body: 'foo',
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE
					}
				})
			)
		).rejects.toThrow('invalid Content-Length header');
		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body: 'foo',
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE,
						'Content-Length': 'invalid'
					}
				})
			)
		).rejects.toThrow('invalid Content-Length header');
	});

	test('data length check', async () => {
		const { blob } = serialize_binary_form(
			{
				foo: 'bar'
			},
			{}
		);
		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body: blob,
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE,
						'Content-Length': (blob.size - 1).toString()
					}
				})
			)
		).rejects.toThrow('data overflow');
	});

	test('file offset table length check', async () => {
		const { blob } = serialize_binary_form(
			{
				file: new File([''], 'a.txt')
			},
			{}
		);
		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body: blob,
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE,
						'Content-Length': (blob.size - 1).toString()
					}
				})
			)
		).rejects.toThrow('file offset table overflow');
	});

	test('file length check', async () => {
		const { blob } = serialize_binary_form(
			{
				file: new File(['a'], 'a.txt')
			},
			{}
		);
		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body: blob,
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE,
						'Content-Length': (blob.size - 1).toString()
					}
				})
			)
		).rejects.toThrow('file data overflow');
	});

	test('does not preallocate large buffers for incomplete bodies', async () => {
		const OriginalUint8Array = Uint8Array;
		const header_bytes = 1 + 4 + 2;
		const data_length = 32 * 1024 * 1024;

		// This test should fail on the vulnerable implementation. To make the overallocation observable,
		// temporarily guard allocations of large Uint8Arrays — the fixed code only allocates after reading
		// the full range, so it should not trip this guard for an incomplete body.
		class GuardedUint8Array extends OriginalUint8Array {
			/** @param {...any} args */
			constructor(...args) {
				if (typeof args[0] === 'number' && args[0] === data_length) {
					throw new Error('EAGER_ALLOC');
				}

				if (args.length === 0) {
					super();
				} else if (args.length === 1) {
					super(/** @type {any} */ (args[0]));
				} else if (args.length === 2) {
					super(/** @type {any} */ (args[0]), /** @type {any} */ (args[1]));
				} else {
					super(
						/** @type {any} */ (args[0]),
						/** @type {any} */ (args[1]),
						/** @type {any} */ (args[2])
					);
				}
			}
		}

		/** @type {any} */ (globalThis).Uint8Array = GuardedUint8Array;
		try {
			// First chunk must include at least 1 byte past the header so that `get_buffer(header_bytes, data_length)`
			// takes the multi-chunk path.
			const first_chunk = new OriginalUint8Array(header_bytes + 1);
			first_chunk[0] = 0;
			const header_view = new DataView(
				first_chunk.buffer,
				first_chunk.byteOffset,
				first_chunk.byteLength
			);
			header_view.setUint32(1, data_length, true);
			header_view.setUint16(5, 0, true);

			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(first_chunk);
					controller.close();
				}
			});

			await expect(
				deserialize_binary_form(
					new Request('http://test', {
						method: 'POST',
						body: stream,
						// @ts-expect-error duplex required in node
						duplex: 'half',
						headers: {
							'Content-Type': BINARY_FORM_CONTENT_TYPE,
							'Content-Length': (header_bytes + data_length).toString()
						}
					})
				)
			).rejects.toThrow('data too short');
		} finally {
			/** @type {any} */ (globalThis).Uint8Array = OriginalUint8Array;
		}
	});

	test('rejects memory amplification attack via nested array in file offset table', async () => {
		// A crafted file offset table
		// containing a nested array like [[1e20,1e20,...,1e20]]. When file_offsets[0] is
		// added to a number, the inner array coerces to a ~273,000-char string. With
		// ~58,000 LazyFile instances from a 1MB payload, this requires ~14.7GB of memory.
		//
		// We use a small payload (13 values) that is enough to trigger the validation
		// error without risk of memory issues if the fix regresses.
		const inner_count = 13;
		const malicious_offsets = JSON.stringify([[...Array(inner_count).fill(1e20)]]);

		// Build a minimal binary form request with the malicious offset table
		const data = '[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],"a.txt","text/plain",0,0,0]';
		const data_buf = text_encoder.encode(data);
		const offsets_buf = text_encoder.encode(malicious_offsets);
		const total = 7 + data_buf.length + offsets_buf.length + 1;
		const body = new Uint8Array(total);
		const view = new DataView(body.buffer);
		body[0] = 0;
		view.setUint32(1, data_buf.length, true);
		view.setUint16(5, offsets_buf.length, true);
		body.set(data_buf, 7);
		body.set(offsets_buf, 7 + data_buf.length);

		await expect(
			deserialize_binary_form(
				new Request('http://test', {
					method: 'POST',
					body,
					headers: {
						'Content-Type': BINARY_FORM_CONTENT_TYPE,
						'Content-Length': total.toString()
					}
				})
			)
		).rejects.toThrow('invalid file offset table');
	}, 1000);

	test.each([
		{
			name: 'nested array (amplification attack)',
			offsets: '[[1e20,1e20]]'
		},
		{
			name: 'non-integer float values',
			offsets: '[0, 1.5, 3]'
		},
		{
			name: 'negative values',
			offsets: '[0, -1, 2]'
		},
		{
			name: 'not an array (object)',
			offsets: '{"0": 0}'
		},
		{
			name: 'string values in array',
			offsets: '["0", "1"]'
		}
	])('rejects invalid file offset table: $name', async ({ offsets }) => {
		await expect(deserialize_binary_form(build_raw_request_with_offsets(offsets))).rejects.toThrow(
			'invalid file offset table'
		);
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
					'Content-Type': BINARY_FORM_CONTENT_TYPE,
					'Content-Length': blob.size.toString()
				}
			})
		);

		expect(res.data).toEqual({ a: 1 });
	});

	/**
	 * Build a binary form request with a raw devalue payload and custom file offsets JSON.
	 * @param {string} file_offsets_json
	 */
	function build_raw_request_with_offsets(file_offsets_json) {
		const devalue_data = '[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],"a.txt","text/plain",0,0,0]';
		const data_buf = text_encoder.encode(devalue_data);
		const offsets_buf = text_encoder.encode(file_offsets_json);
		const total = 7 + data_buf.length + offsets_buf.length + 1; // +1 for a fake file byte
		const body = new Uint8Array(total);
		const view = new DataView(body.buffer);
		body[0] = 0;
		view.setUint32(1, data_buf.length, true);
		view.setUint16(5, offsets_buf.length, true);
		body.set(data_buf, 7);
		body.set(offsets_buf, 7 + data_buf.length);
		return new Request('http://test', {
			method: 'POST',
			body,
			headers: {
				'Content-Type': BINARY_FORM_CONTENT_TYPE,
				'Content-Length': total.toString()
			}
		});
	}
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
