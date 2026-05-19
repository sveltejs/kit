/**
 * Yields parsed JSON objects from a ReadableStream of newline-delimited JSON.
 * Each yielded value is the raw `JSON.parse`'d object — callers handle deserialization.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
export async function* read_ndjson(reader) {
	let done = false;
	let buffer = '';
	const decoder = new TextDecoder();

	while (true) {
		let split = buffer.indexOf('\n');
		while (split !== -1) {
			const line = buffer.slice(0, split).trim();
			buffer = buffer.slice(split + 1);

			if (line) {
				yield JSON.parse(line);
			}

			split = buffer.indexOf('\n');
		}

		if (done) {
			const line = buffer.trim();
			if (line) {
				yield JSON.parse(line);
			}
			return;
		}

		const chunk = await reader.read();
		done = chunk.done;
		if (chunk.value) {
			buffer += decoder.decode(chunk.value, { stream: true });
		}

		if (done) {
			buffer += decoder.decode();
		}
	}
}
