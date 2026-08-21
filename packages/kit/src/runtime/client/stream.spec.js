import { expect, test } from 'vitest';
import { read_stream } from './stream.js';

const encoder = new TextEncoder();

/**
 * @param {Uint8Array[]} chunks
 * @param {string} delimiter
 * @param {TextDecoderOptions} [options]
 * @returns {Promise<string[]>}
 */
async function collect(chunks, delimiter, options) {
	const values = [];
	const reader = new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
			}
			controller.close();
		}
	}).getReader();

	for await (const value of read_stream(reader, delimiter, options)) {
		values.push(value);
	}

	return values;
}

test('parses a delimiter split across chunks', async () => {
	const chunks = [encoder.encode('a\n'), encoder.encode('\nb')];

	await expect(collect(chunks, '\n\n')).resolves.toEqual(['a', 'b']);
});

test('parses UTF-8 code points split across chunks', async () => {
	const bytes = encoder.encode('a\u00e9\n');
	const chunks = Array.from(bytes, (byte) => new Uint8Array([byte]));

	await expect(collect(chunks, '\n')).resolves.toEqual(['a\u00e9']);
});

test('parses a frame much larger than a chunk', async () => {
	const size = 100 * 1024;
	const chunks = Array.from({ length: size / 1024 }, () => encoder.encode('x'.repeat(1024)));
	chunks.push(encoder.encode('\n'));

	const values = await collect(chunks, '\n');
	expect(values).toHaveLength(1);
	expect(values[0]).toHaveLength(size);
	expect(values[0]?.slice(0, 5)).toBe('xxxxx');
	expect(values[0]?.slice(-5)).toBe('xxxxx');
});

test('parses short frames after a long frame', async () => {
	const prefix = 'x'.repeat(100 * 1024);
	const chunks = [encoder.encode(prefix), encoder.encode('end\nshort1\nshort2\n')];

	await expect(collect(chunks, '\n')).resolves.toEqual([`${prefix}end`, 'short1', 'short2']);
});

test('parses a trailing frame without yielding trailing empty frames', async () => {
	await expect(collect([encoder.encode('trailing')], '\n')).resolves.toEqual(['trailing']);
	await expect(collect([encoder.encode('complete\n')], '\n')).resolves.toEqual(['complete']);
});

test('rejects malformed UTF-8', async () => {
	const chunks = [encoder.encode('valid'), new Uint8Array([0xff]), encoder.encode('\n')];

	await expect(collect(chunks, '\n', { fatal: true })).rejects.toThrow(TypeError);
});
