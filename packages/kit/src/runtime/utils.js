/** @import { RemoteFormIssue } from '@sveltejs/kit' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { BROWSER } from 'esm-env';

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

/**
 * Convert `FormData` into a POJO
 * @param {FormData} data
 */
export function convert_formdata(data) {
	/** @type {Record<string, any>} */
	const result = Object.create(null); // guard against prototype pollution

	for (let key of data.keys()) {
		const is_array = key.endsWith('[]');
		let values = data.getAll(key);

		if (is_array) key = key.slice(0, -2);

		if (values.length > 1 && !is_array) {
			throw new Error(`Form cannot contain duplicated keys — "${key}" has ${values.length} values`);
		}

		// an empty `<input type="file">` will submit a non-existent file, bizarrely
		values = values.filter(
			(entry) => typeof entry === 'string' || entry.name !== '' || entry.size > 0
		);

		deep_set(result, split_path(key), is_array ? values : values[0]);
	}

	return result;
}

const path_regex = /^[a-zA-Z_$]\w*(\.[a-zA-Z_$]\w*|\[\d+\])*$/;

/**
 * @param {string} path
 */
export function split_path(path) {
	if (!path_regex.test(path)) {
		throw new Error(`Invalid path ${path}`);
	}

	return path.split(/\.|\[|\]/).filter(Boolean);
}

/**
 * @param {Record<string, any>} object
 * @param {string[]} keys
 * @param {any} value
 */
export function deep_set(object, keys, value) {
	for (let i = 0; i < keys.length - 1; i += 1) {
		const key = keys[i];
		const is_array = /^\d+$/.test(keys[i + 1]);

		if (object[key]) {
			if (is_array !== Array.isArray(object[key])) {
				throw new Error(`Invalid array key ${keys[i + 1]}`);
			}
		} else {
			object[key] ??= is_array ? [] : Object.create(null); // guard against prototype pollution
		}
		object = object[key];
	}

	object[keys[keys.length - 1]] = value;
}

/**
 * @param {readonly StandardSchemaV1.Issue[]} issues
 */
export function flatten_issues(issues) {
	/** @type {Record<string, RemoteFormIssue[]>} */
	const result = {};

	for (const issue of issues) {
		/** @type {RemoteFormIssue} */
		const normalized = { name: '', path: [], message: issue.message };

		(result.$ ??= []).push(normalized);

		let name = '';

		if (issue.path !== undefined) {
			for (const segment of issue.path) {
				const key = /** @type {string | number} */ (
					typeof segment === 'object' ? segment.key : segment
				);

				normalized.path.push(key);

				if (typeof key === 'number') {
					name += `[${key}]`;
				} else if (typeof key === 'string') {
					name += name === '' ? key : '.' + key;
				}

				(result[name] ??= []).push(normalized);
			}

			normalized.name = name;
		}
	}

	return result;
}

/**
 * We need to encode `File` objects when returning `issues` from a `form` submission,
 * because some validators include the original value in the issue. It doesn't
 * need to deserialize to a `File` object
 * @type {import('@sveltejs/kit').Transporter}
 */
export const file_transport = {
	encode: (file) =>
		file instanceof File && {
			size: file.size,
			type: file.type,
			name: file.name,
			lastModified: file.lastModified
		},
	decode: (data) => data
};
