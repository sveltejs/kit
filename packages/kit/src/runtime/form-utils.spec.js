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

	test('rejects type confusion attack on file metadata', async () => {
		// Reproduces the attack from the vulnerability report: a crafted devalue payload
		// where File metadata contains nested arrays referencing a BigInt(1e308) instead
		// of primitive values. Without validation, arithmetic on `size` triggers recursive
		// array-to-string coercion causing CPU exhaustion.
		//
		// Uses the same payload structure as the original POC but with repeats=2
		// (enough to prove the fix, without risk of stalling if it regresses).
		const repeats = 2;

		const data = JSON.stringify([
			// Index 0: root array referencing File proxy objects at indices 10, 11
			[...Array(repeats)].map((_, i) => 10 + i),
			// Index 1: holey array [, , size] — devalue HOLE (-2) creates sparse entries
			// so the File reviver gets [undefined, undefined, <nested arrays>]
			[-2, -2, 2],
			// Indices 2–8: cascade of arrays referencing each other, amplifying traversal
			[3, 3, 3, 3, 3, 3, 3],
			[4, 4, 4, 4, 4, 4, 4],
			[5, 5, 5, 5, 5, 5, 5, 5],
			[6, 6, 6, 6, 6, 6, 6, 6],
			[7, 7, 7, 7, 7, 7, 7, 7],
			[8, 8, 8, 8, 8, 8, 8, 8],
			[9, 9, 9, 9, 9, 9, 9, 9],
			// Index 9: BigInt(1e308) — a 309-digit number, expensive to coerce to string
			['BigInt', 1e308],
			// Indices 10+: File objects referencing the holey array at index 1
			...Array(repeats).fill(['File', 1])
		]);

		const file_offsets = JSON.stringify([0]);
		const data_buf = text_encoder.encode(data);
		const offsets_buf = text_encoder.encode(file_offsets);
		const total = 7 + data_buf.length + offsets_buf.length;
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
		).rejects.toThrow('invalid file metadata');
	}, 1000);

	test.each([
		{
			name: 'name is a number instead of string',
			payload: '[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],123,"text/plain",0,0,0]'
		},
		{
			name: 'size is an array instead of number',
			payload: '[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],"a.txt","text/plain",[10,10,10],0,0,1]'
		},
		{
			name: 'last_modified is a string instead of number',
			payload: '[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],"a.txt","text/plain",0,"bad",0]'
		},
		{
			name: 'sparse/holey array (fields are undefined)',
			payload: '[[1,3],{"file":2},["File",4],{},[-2,-2,7],"a.txt","text/plain",0]'
		}
	])('rejects invalid file metadata: $name', async ({ payload }) => {
		await expect(deserialize_binary_form(build_raw_request(payload))).rejects.toThrow(
			'invalid file metadata'
		);
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
		await expect(
			deserialize_binary_form(
				build_raw_request(
					'[[1,3],{"file":2},["File",4],{},[5,6,7,8,9],"a.txt","text/plain",0,0,0]',
					offsets
				)
			)
		).rejects.toThrow('invalid file offset table');
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
	 * Build a binary form request with a raw devalue payload.
	 * @param {string} devalue_data
	 * @param {string} file_offsets_json
	 */
	function build_raw_request(devalue_data, file_offsets_json = '[0]') {
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

	/**
	 * Build a binary form request with a raw devalue payload and explicit file data.
	 * @param {string} devalue_data
	 * @param {string} file_offsets_json
	 * @param {number} file_data_bytes - number of file data bytes to append
	 */
	function build_raw_request_with_files(devalue_data, file_offsets_json, file_data_bytes) {
		const data_buf = text_encoder.encode(devalue_data);
		const offsets_buf = text_encoder.encode(file_offsets_json);
		const total = 7 + data_buf.length + offsets_buf.length + file_data_bytes;
		const body = new Uint8Array(total);
		const view = new DataView(body.buffer);
		body[0] = 0;
		view.setUint32(1, data_buf.length, true);
		view.setUint16(5, offsets_buf.length, true);
		body.set(data_buf, 7);
		body.set(offsets_buf, 7 + data_buf.length);
		// Fill file data region with 0x41 ('A')
		body.fill(0x41, 7 + data_buf.length + offsets_buf.length);
		return new Request('http://test', {
			method: 'POST',
			body,
			headers: {
				'Content-Type': BINARY_FORM_CONTENT_TYPE,
				'Content-Length': total.toString()
			}
		});
	}

	test('rejects overlapping file data', async () => {
		// Two files that reference different offset table entries but whose byte
		// ranges overlap: file a at offset 0 with size 3, file b at offset 1 with size 3.
		// Devalue payload with two files:
		//   index 0: [1,3] - root [data, meta]
		//   index 1: {"a":2,"b":4} - data
		//   index 2: ["File",6] - file a reviver
		//   index 3: {} - meta
		//   index 4: ["File",7] - file b reviver
		//   index 5: (unused)
		//   index 6: [8,9,10,11,12] - file a params [name, type, size, last_modified, offset_index]
		//   index 7: [8,9,10,11,13] - file b params (different offset_index)
		//   index 8: "a.txt"
		//   index 9: "text/plain"
		//   index 10: 3 - size for both files
		//   index 11: 0 - last_modified
		//   index 12: 0 - offset table index 0
		//   index 13: 1 - offset table index 1
		const payload =
			'[[1,3],{"a":2,"b":4},["File",6],{},["File",7],0,[8,9,10,11,12],[8,9,10,11,13],"a.txt","text/plain",3,0,0,1]';
		// file_offsets: [0, 1] — file a starts at 0, file b starts at 1.
		// With size=3 each, they overlap (0..3 and 1..4).
		await expect(
			deserialize_binary_form(build_raw_request_with_files(payload, '[0,1]', 4))
		).rejects.toThrow('overlapping file data');
	});

	test('rejects duplicate file offset table index', async () => {
		// Two files that both reference offset table index 0.
		// Same devalue structure as above, but both files use offset_index=0.
		const payload =
			'[[1,3],{"a":2,"b":4},["File",6],{},["File",7],0,[8,9,10,11,12],[8,9,10,11,12],"a.txt","text/plain",1,0,0]';
		await expect(
			deserialize_binary_form(build_raw_request_with_files(payload, '[0]', 1))
		).rejects.toThrow('duplicate file offset table index');
	});

	test('rejects gaps in file data', async () => {
		// Two files with a gap between them: file a at offset 0 with size 1,
		// file b at offset 3 with size 1 — gap at bytes 1..3.
		const payload =
			'[[1,3],{"a":2,"b":4},["File",6],{},["File",7],0,[8,9,10,11,12],[8,9,10,11,13],"a.txt","text/plain",1,0,0,1]';
		// file_offsets: [0, 3] — file a at 0 (size 1), file b at 3 (size 1), gap at 1..3.
		await expect(
			deserialize_binary_form(build_raw_request_with_files(payload, '[0,3]', 4))
		).rejects.toThrow('gaps in file data');
	});

	test('rejects amplification attack via overlapping file data', async () => {
		// Simulates the vulnerability: many files all pointing to the same data region.
		// Without the fix, an attacker could craft a <1MB payload that appears to contain
		// 100+ GB of file data by reusing the same offset for every file entry.
		const file_count = 100;
		const file_size = 512;

		// Build a devalue payload with file_count files.
		// Layout:
		//   0: [1,2] — root [data, meta]
		//   1: [file_reviver_indices...] — data array
		//   2: {} — meta
		//   3: ["File", 4] — first file reviver, params at index 4
		//   4: [S, S+1, S+2, S+3, S+4] — first file params
		//   5: ["File", 6] — second file reviver, params at index 6
		//   6: [S, S+1, S+2, S+3, S+5] — second file params
		//   ...
		//   S: "a.txt" — shared name
		//   S+1: "text/plain" — shared type
		//   S+2: file_size — shared size
		//   S+3: 0 — shared last_modified
		//   S+4: 0 — offset index for file 0
		//   S+5: 1 — offset index for file 1
		//   ...
		const entries = [];
		entries.push('[1,2]'); // 0: root
		const file_reviver_indices = [];
		for (let i = 0; i < file_count; i++) {
			file_reviver_indices.push(3 + i * 2);
		}
		entries.push(`[${file_reviver_indices.join(',')}]`); // 1: data array
		entries.push('{}'); // 2: meta

		const shared_start = 3 + file_count * 2;
		for (let i = 0; i < file_count; i++) {
			const params_idx = 3 + i * 2 + 1;
			entries.push(`["File",${params_idx}]`);
			entries.push(
				`[${shared_start},${shared_start + 1},${shared_start + 2},${shared_start + 3},${shared_start + 4 + i}]`
			);
		}

		// Shared values
		entries.push('"a.txt"');
		entries.push('"text/plain"');
		entries.push(String(file_size));
		entries.push('0');
		// Per-file offset index values (each file gets a unique index into offset table)
		for (let i = 0; i < file_count; i++) {
			entries.push(String(i));
		}

		const payload = `[${entries.join(',')}]`;
		// All offset table entries point to 0 — the amplification vector
		const offsets = JSON.stringify(new Array(file_count).fill(0));

		await expect(
			deserialize_binary_form(build_raw_request_with_files(payload, offsets, file_size))
		).rejects.toThrow('overlapping file data');
	}, 1000);

	test('accepts valid payload with zero-length files', async () => {
		// Zero-length files should be valid — they all sit at the same offset with size 0.
		// This tests the secondary sort by size in the overlap check.
		const { blob } = serialize_binary_form(
			{
				a: new File([], 'a.txt', { type: 'text/plain' }),
				b: new File([], 'b.txt', { type: 'text/plain' }),
				c: new File(['x'], 'c.txt', { type: 'text/plain' })
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
		expect(res.data.a.size).toBe(0);
		expect(res.data.b.size).toBe(0);
		expect(res.data.c.size).toBe(1);
		expect(await res.data.c.text()).toBe('x');
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
