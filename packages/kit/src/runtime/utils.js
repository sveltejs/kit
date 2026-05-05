import { BROWSER } from 'esm-env';
import { posixify } from '../utils/os.js';

/**
 * Resolved path of the `runtime` directory posix-ified
 *
 * TODO Windows issue:
 * Vite or sth else somehow sets the driver letter inconsistently to lower or upper case depending on the run environment.
 * In playwright debug mode run through VS Code this a root-to-lowercase conversion is needed in order for the tests to run.
 * If we do this conversion in other cases it has the opposite effect though and fails.
 */
// import.meta.dirname doesn't exist on the client so we need to avoid running
// posixify to avoid a runtime error when it's undefined
export const runtime_directory = import.meta.dirname ? posixify(import.meta.dirname) : '';

export const text_encoder = new TextEncoder();

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
