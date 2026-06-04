import { read_stream } from './stream.js';

/**
 * @param {string} block
 * @returns {string | undefined}
 */
function parse_sse_event_data(block) {
	const lines = block.split('\n');
	let data = '';

	for (const line of lines) {
		if (line.startsWith('data:')) {
			data += (data ? '\n' : '') + line.slice(5).trimStart();
		}
	}

	return data || undefined;
}

/**
 * Yields parsed JSON objects from a ReadableStream of Server-Sent Events.
 * Each yielded value is the raw `JSON.parse`'d object from a `data:` field.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
export async function* read_sse(reader) {
	for await (const block of read_stream(reader, '\n\n')) {
		const data = parse_sse_event_data(block);
		if (data) {
			yield JSON.parse(data);
		}
	}
}
