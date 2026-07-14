import { read_stream } from './stream.js';

/**
 * Yields parsed JSON objects from a ReadableStream of newline-delimited JSON.
 * Each yielded value is the raw `JSON.parse`'d object — callers handle deserialization.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
export async function* read_ndjson(reader) {
	for await (const block of read_stream(reader, '\n')) {
		const line = block.trim();
		if (line) {
			yield JSON.parse(line);
		}
	}
}
