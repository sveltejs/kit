export const text_encoder = new TextEncoder();
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
	const binary = atob(encoded);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	return bytes;
}
