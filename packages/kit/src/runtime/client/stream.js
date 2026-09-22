/**
 * Reads from a stream, decoding it as text and yielding each block of content
 * separated by `delimiter`. The trailing block (if any) is yielded once the
 * stream closes.
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {string} delimiter
 * @param {TextDecoderOptions} [options]
 */
export async function* read_stream(reader, delimiter, options) {
	let done = false;
	/** @type {string[]} */
	let parts = [];
	let rest = '';
	const decoder = new TextDecoder(undefined, options);
	const carry = delimiter.length - 1;

	while (!done) {
		const chunk = await reader.read();
		done = chunk.done;
		let text = rest;
		if (chunk.value) text += decoder.decode(chunk.value, { stream: true });
		if (done) text += decoder.decode();

		let start = 0;
		let split = text.indexOf(delimiter);
		while (split !== -1) {
			if (parts.length > 0) {
				parts.push(text.slice(start, split));
				yield parts.join('');
				parts = [];
			} else {
				yield text.slice(start, split);
			}
			start = split + delimiter.length;
			split = text.indexOf(delimiter, start);
		}

		const keep = Math.max(start, text.length - carry);
		if (keep > start) parts.push(text.slice(start, keep));
		rest = text.slice(keep);
	}

	if (parts.length > 0 || rest) {
		yield parts.join('') + rest;
	}
}
