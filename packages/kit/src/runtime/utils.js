import { BROWSER } from 'esm-env';

export const text_encoder = new TextEncoder();

/**
 * @param {string} head
 * @param {AsyncIterable<string>} chunks
 * @returns {ReadableStream<Uint8Array>} `head` followed by each non-empty chunk, encoded
 */
export function stream_text(head, chunks) {
	// TODO remove the cast once TypeScript's lib includes `ReadableStream.from`
	return /** @type {any} */ (ReadableStream).from(
		(async function* () {
			yield text_encoder.encode(head);
			for await (const chunk of chunks) {
				if (chunk) yield text_encoder.encode(chunk);
			}
		})()
	);
}
export const text_decoder = new TextDecoder();

/**
 * Like node's path.relative, but without using node
 * @param {string} from
 * @param {string} to
 */
export function get_relative_path(from, to) {
	const from_parts = from.split(/[/\\]/);
	const to_parts = to.split(/[/\\]/);
	from_parts.pop(); // get dirname

	while (from_parts[0] === to_parts[0]) {
		from_parts.shift();
		to_parts.shift();
	}

	let i = from_parts.length;
	while (i--) from_parts[i] = '..';

	return from_parts.concat(to_parts).join('/');
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base64_encode(bytes) {
	// TODO replace with `bytes.toBase64()` when we require Node >= 25
	// Using `Buffer` is faster than iterating
	if (!BROWSER && globalThis.Buffer) {
		return globalThis.Buffer.from(bytes).toString('base64');
	}

	let binary = '';

	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary);
}

/**
 * @param {string} encoded
 * @returns {Uint8Array}
 */
export function base64_decode(encoded) {
	// TODO replace with `Uint8Array.fromBase64(encoded)` when we require Node >= 25
	// Using `Buffer` is faster than iterating
	if (!BROWSER && globalThis.Buffer) {
		const buffer = globalThis.Buffer.from(encoded, 'base64');
		return new Uint8Array(buffer);
	}

	const binary = atob(encoded);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}
