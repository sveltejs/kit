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
	let done = false;
	let buffer = '';
	const decoder = new TextDecoder();

	while (true) {
		let split = buffer.indexOf('\n\n');
		while (split !== -1) {
			const block = buffer.slice(0, split);
			buffer = buffer.slice(split + 2);

			const data = parse_sse_event_data(block);
			if (data) {
				yield JSON.parse(data);
			}

			split = buffer.indexOf('\n\n');
		}

		if (done) {
			const block = buffer.trim();
			if (block) {
				const data = parse_sse_event_data(block);
				if (data) {
					yield JSON.parse(data);
				}
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
