import { expect, test } from 'vitest';
import { read_ndjson } from './ndjson.js';

const encoder = new TextEncoder();

/**
 * @param {Uint8Array[]} chunks
 */
function read(chunks) {
	return read_ndjson(
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			}
		}).getReader()
	);
}

/**
 * @param {Uint8Array[]} chunks
 */
async function collect(chunks) {
	const values = [];
	for await (const value of read(chunks)) {
		values.push(value);
	}
	return values;
}

test('parses streamed data when UTF-8 code points are split across chunks', async () => {
	const bytes = encoder.encode(`${JSON.stringify({ type: 'data', value: '\u00e9' })}\n`);
	const chunks = Array.from(bytes, (byte) => new Uint8Array([byte]));

	await expect(collect(chunks)).resolves.toEqual([{ type: 'data', value: '\u00e9' }]);
});

test('rejects malformed UTF-8 before parsing streamed data', async () => {
	const chunks = [
		encoder.encode('{"type":"data","nodes":[{"id":239,'),
		new Uint8Array([0xff]),
		encoder.encode('"url":240}]}\n')
	];

	await expect(collect(chunks)).rejects.toThrow(TypeError);
});
