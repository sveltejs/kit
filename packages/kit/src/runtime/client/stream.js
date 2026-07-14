/**
 * Reads from a stream, decoding it as text and yielding each block of content
 * separated by `delimiter`. The trailing block (if any) is yielded once the
 * stream closes.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {string} delimiter
 */
export async function* read_stream(reader, delimiter) {
	let done = false;
	let buffer = '';
	const decoder = new TextDecoder();

	while (true) {
		let split = buffer.indexOf(delimiter);
		while (split !== -1) {
			yield buffer.slice(0, split);
			buffer = buffer.slice(split + delimiter.length);
			split = buffer.indexOf(delimiter);
		}

		if (done) {
			if (buffer) {
				yield buffer;
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
