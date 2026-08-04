/** @import { BinaryFormMeta, InternalRemoteFormIssue } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

import { DEV } from 'esm-env';
import * as devalue from 'devalue';
import { text_decoder, text_encoder } from './utils.js';
import { noop } from '../utils/functions.js';
import { SvelteKitError } from '@sveltejs/kit/internal';

/**
 * Sets a parsed form field value in a nested object, mutating the original object.
 * @param {Record<string, any>} object
 * @param {{ name: string; type: 'number' | 'boolean' | null }} field
 * @param {any} value
 */
export function set_nested_value(object, field, value) {
	deep_set(object, split_path(field.name), value);
}

/**
 * Separates a form field's path from the metadata encoded in its name.
 * @param {string} form_id
 * @param {string} key
 * @returns {{ name: string; type: 'number' | 'boolean' | null; is_array: boolean }}
 */
export function parse_form_key(form_id, key) {
	const suffix = '/' + form_id;
	let name = key;

	if (!name.endsWith(suffix)) {
		throw new Error(`Form contained a field that wasn't created with form.fields.as(...): ${name}`);
	}

	name = name.slice(0, -suffix.length);

	/** @type {'number' | 'boolean' | null} */
	let type = null;

	if (name.startsWith('n:')) {
		name = name.slice(2);
		type = 'number';
	} else if (name.startsWith('b:')) {
		name = name.slice(2);
		type = 'boolean';
	}

	const is_array = name.endsWith('[]');
	if (is_array) name = name.slice(0, -2);

	return { name, type, is_array };
}

/**
 * @param {'number' | 'boolean' | null} type
 * @param {any} value
 * @returns {any}
 */
export function coerce_form_value(type, value) {
	if (Array.isArray(value)) return value.map((value) => coerce_form_value(type, value));
	if (type === 'number') return value === '' ? undefined : parseFloat(value);
	if (type === 'boolean') return value === 'on';
	return value;
}

/** Pass this to set_nested_value to delete the last part of the given path */
export const DELETE_KEY = {};

/**
 * Convert `FormData` into a POJO
 * @param {string} form_id
 * @param {FormData} data
 */
export function convert_formdata(form_id, data) {
	/** @type {Record<string, any>} */
	const result = {};

	for (const field_name of data.keys()) {
		/** @type {any[]} */
		const values = data.getAll(field_name);

		const field = parse_form_key(form_id, field_name);

		// an empty `<input type="file">` will submit a non-existent file, bizarrely
		const entries = values.filter(
			(entry) => typeof entry === 'string' || entry.name !== '' || entry.size > 0
		);
		if (entries.length === 0 && !field.is_array) continue;

		if (entries.length > 1 && !field.is_array) {
			throw new Error(
				`Form cannot contain duplicated keys — "${field.name}" has ${entries.length} values`
			);
		}

		set_nested_value(
			result,
			field,
			coerce_form_value(field.type, field.is_array ? entries : entries[0])
		);
	}

	return result;
}

export const BINARY_FORM_CONTENT_TYPE = 'application/x-sveltekit-formdata';
const BINARY_FORM_VERSION = 0;
const HEADER_BYTES = 1 + 4 + 2;
/**
 * The binary format is as follows:
 * - 1 byte: Format version
 * - 4 bytes: Length of the header (u32)
 * - 2 bytes: Length of the file offset table (u16)
 * - header: devalue.stringify([data, meta])
 * - file offset table: JSON.stringify([offset1, offset2, ...]) (empty if no files) (offsets start from the end of the table)
 * - file1, file2, ...
 * @param {Record<string, any>} data
 * @param {BinaryFormMeta} meta
 */
export function serialize_binary_form(data, meta) {
	/** @type {Array<BlobPart>} */
	const blob_parts = [new Uint8Array([BINARY_FORM_VERSION])];

	/** @type {Array<[file: File, index: number]>} */
	const files = [];

	const encoded_header = devalue.stringify([data, meta], {
		File: (file) => {
			if (!(file instanceof File)) return;

			files.push([file, files.length]);
			return [file.name, file.type, file.size, file.lastModified, files.length - 1];
		}
	});

	const encoded_header_buffer = text_encoder.encode(encoded_header);

	let encoded_file_offsets = '';
	if (files.length) {
		// Sort small files to the front
		files.sort(([a], [b]) => a.size - b.size);

		/** @type {Array<number>} */
		const file_offsets = new Array(files.length);
		let start = 0;
		for (const [file, index] of files) {
			file_offsets[index] = start;
			start += file.size;
		}
		encoded_file_offsets = JSON.stringify(file_offsets);
	}

	const length_buffer = new Uint8Array(4);
	const length_view = new DataView(length_buffer.buffer);

	length_view.setUint32(0, encoded_header_buffer.byteLength, true);
	blob_parts.push(length_buffer.slice());

	length_view.setUint16(0, encoded_file_offsets.length, true);
	blob_parts.push(length_buffer.slice(0, 2));

	blob_parts.push(encoded_header_buffer);
	blob_parts.push(encoded_file_offsets);

	for (const [file] of files) {
		blob_parts.push(file);
	}

	return {
		blob: new Blob(blob_parts)
	};
}

/**
 * @param {Request} request
 * @param {string} form_id
 * @returns {Promise<{ data: Record<string, any>; meta: BinaryFormMeta; form_data: FormData | null }>}
 */
export async function deserialize_binary_form(request, form_id) {
	if (request.headers.get('content-type') !== BINARY_FORM_CONTENT_TYPE) {
		const form_data = await request.formData();
		return { data: convert_formdata(form_id, form_data), meta: {}, form_data };
	}
	if (!request.body) {
		throw deserialize_error('no body');
	}

	const reader = request.body.getReader();

	/** @type {Array<Promise<Uint8Array<ArrayBuffer> | undefined>>} */
	const chunks = [];

	/**
	 * @param {number} index
	 * @returns {Promise<Uint8Array<ArrayBuffer> | undefined>}
	 */
	function get_chunk(index) {
		if (index in chunks) return chunks[index];

		let i = chunks.length;
		while (i <= index) {
			chunks[i] = reader.read().then((chunk) => chunk.value);
			i++;
		}
		return chunks[index];
	}

	/**
	 * @param {number} offset
	 * @param {number} length
	 * @returns {Promise<Uint8Array | null>}
	 */
	async function get_buffer(offset, length) {
		/** @type {Uint8Array} */
		let start_chunk;
		let chunk_start = 0;
		/** @type {number} */
		let chunk_index;
		for (chunk_index = 0; ; chunk_index++) {
			const chunk = await get_chunk(chunk_index);
			if (!chunk) return null;

			const chunk_end = chunk_start + chunk.byteLength;
			// If this chunk contains the target offset
			if (offset >= chunk_start && offset < chunk_end) {
				start_chunk = chunk;
				break;
			}
			chunk_start = chunk_end;
		}
		// If the buffer is completely contained in one chunk, do a subarray
		if (offset + length <= chunk_start + start_chunk.byteLength) {
			return start_chunk.subarray(offset - chunk_start, offset + length - chunk_start);
		}
		// Otherwise, copy the data into a new buffer
		const chunks = [start_chunk.subarray(offset - chunk_start)];
		let cursor = start_chunk.byteLength - offset + chunk_start;
		while (cursor < length) {
			chunk_index++;
			let chunk = await get_chunk(chunk_index);
			if (!chunk) return null;
			if (chunk.byteLength > length - cursor) {
				chunk = chunk.subarray(0, length - cursor);
			}
			chunks.push(chunk);
			cursor += chunk.byteLength;
		}
		const buffer = new Uint8Array(length);
		cursor = 0;
		for (const chunk of chunks) {
			buffer.set(chunk, cursor);
			cursor += chunk.byteLength;
		}

		return buffer;
	}

	const header = await get_buffer(0, HEADER_BYTES);
	if (!header) throw deserialize_error('too short');

	if (header[0] !== BINARY_FORM_VERSION) {
		throw deserialize_error(`got version ${header[0]}, expected version ${BINARY_FORM_VERSION}`);
	}
	const header_view = new DataView(header.buffer, header.byteOffset, header.byteLength);
	const data_length = header_view.getUint32(1, true);
	const file_offsets_length = header_view.getUint16(5, true);

	// Validation uses embedded binary header fields (data_length, file_offsets_length)
	// rather than Content-Length, which proxies/middleboxes may strip or corrupt.
	// See: https://github.com/sveltejs/kit/issues/15299

	// Read the form data
	const data_buffer = await get_buffer(HEADER_BYTES, data_length);
	if (!data_buffer) throw deserialize_error('data too short');

	/** @type {Array<number | undefined>} */
	let file_offsets;
	/** @type {number} */
	let files_start_offset;
	if (file_offsets_length > 0) {
		// Read the file offset table
		const file_offsets_buffer = await get_buffer(HEADER_BYTES + data_length, file_offsets_length);
		if (!file_offsets_buffer) throw deserialize_error('file offset table too short');

		const parsed_offsets = JSON.parse(text_decoder.decode(file_offsets_buffer));

		if (
			!Array.isArray(parsed_offsets) ||
			parsed_offsets.some((n) => typeof n !== 'number' || !Number.isInteger(n) || n < 0)
		) {
			throw deserialize_error('invalid file offset table');
		}

		file_offsets = /** @type {Array<number>} */ (parsed_offsets);
		files_start_offset = HEADER_BYTES + data_length + file_offsets_length;
	}

	/** @type {Array<{ offset: number, size: number }>} */
	const file_spans = [];
	const [data, meta] = devalue.parse(text_decoder.decode(data_buffer), {
		File: ([name, type, size, last_modified, index]) => {
			if (
				typeof name !== 'string' ||
				typeof type !== 'string' ||
				typeof size !== 'number' ||
				typeof last_modified !== 'number' ||
				typeof index !== 'number'
			) {
				throw deserialize_error('invalid file metadata');
			}

			let offset = file_offsets[index];

			// Check that the file offset table entry has not been already
			// used. If not, immediately mark it as used.
			if (offset === undefined) {
				throw deserialize_error('duplicate file offset table index');
			}
			file_offsets[index] = undefined;

			offset += files_start_offset;

			file_spans.push({ offset, size });

			return new Proxy(new LazyFile(name, type, size, last_modified, get_chunk, offset), {
				getPrototypeOf() {
					// Trick validators into thinking this is a normal File
					return File.prototype;
				}
			});
		}
	});

	// Sort file spans in increasing order primarily by offset
	// and secondarily by size (to allow 0-length files).
	file_spans.sort((a, b) => a.offset - b.offset || a.size - b.size);

	// Check that file spans do not overlap and there are no gaps between them.
	for (let i = 1; i < file_spans.length; i++) {
		const previous = file_spans[i - 1];
		const current = file_spans[i];

		const previous_end = previous.offset + previous.size;
		if (previous_end < current.offset) {
			throw deserialize_error('gaps in file data');
		}
		if (previous_end > current.offset) {
			throw deserialize_error('overlapping file data');
		}
	}

	// Read the request body asynchronously so it doesn't stall
	void (async () => {
		let has_more = true;
		while (has_more) {
			const chunk = await get_chunk(chunks.length);
			has_more = !!chunk;
		}
	})().catch(noop); // prevent unhandled rejection potentially crashing the process

	return { data, meta, form_data: null };
}
/**
 * @param {string} message
 */
function deserialize_error(message) {
	return new SvelteKitError(400, 'Bad Request', `Could not deserialize binary form: ${message}`);
}

/** @implements {File} */
class LazyFile {
	/** @type {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} */
	#get_chunk;
	/** @type {number} */
	#offset;
	/**
	 * @param {string} name
	 * @param {string} type
	 * @param {number} size
	 * @param {number} last_modified
	 * @param {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} get_chunk
	 * @param {number} offset
	 */
	constructor(name, type, size, last_modified, get_chunk, offset) {
		this.name = name;
		this.type = type;
		this.size = size;
		this.lastModified = last_modified;
		this.webkitRelativePath = '';
		this.#get_chunk = get_chunk;
		this.#offset = offset;

		// TODO - hacky, required for private members to be accessed on proxy
		this.arrayBuffer = this.arrayBuffer.bind(this);
		this.bytes = this.bytes.bind(this);
		this.slice = this.slice.bind(this);
		this.stream = this.stream.bind(this);
		this.text = this.text.bind(this);
	}
	/** @type {ArrayBuffer | undefined} */
	#buffer;
	async arrayBuffer() {
		this.#buffer ??= await new Response(this.stream()).arrayBuffer();
		return this.#buffer;
	}
	async bytes() {
		return new Uint8Array(await this.arrayBuffer());
	}
	/**
	 * @param {number=} start
	 * @param {number=} end
	 * @param {string=} contentType
	 */
	slice(start = 0, end = this.size, contentType = this.type) {
		// https://github.com/nodejs/node/blob/a5f3cd8cb5ba9e7911d93c5fd3ebc6d781220dd8/lib/internal/blob.js#L240
		if (start < 0) {
			start = Math.max(this.size + start, 0);
		} else {
			start = Math.min(start, this.size);
		}

		if (end < 0) {
			end = Math.max(this.size + end, 0);
		} else {
			end = Math.min(end, this.size);
		}
		const size = Math.max(end - start, 0);
		const file = new LazyFile(
			this.name,
			contentType,
			size,
			this.lastModified,
			this.#get_chunk,
			this.#offset + start
		);

		return file;
	}
	stream() {
		let cursor = 0;
		let chunk_index = 0;
		return new ReadableStream({
			start: async (controller) => {
				let chunk_start = 0;
				/** @type {Uint8Array} */
				let start_chunk;
				for (chunk_index = 0; ; chunk_index++) {
					const chunk = await this.#get_chunk(chunk_index);
					if (!chunk) return null;

					const chunk_end = chunk_start + chunk.byteLength;
					// If this chunk contains the target offset
					if (this.#offset >= chunk_start && this.#offset < chunk_end) {
						start_chunk = chunk;
						break;
					}
					chunk_start = chunk_end;
				}
				// If the buffer is completely contained in one chunk, do a subarray
				if (this.#offset + this.size <= chunk_start + start_chunk.byteLength) {
					controller.enqueue(
						start_chunk.subarray(this.#offset - chunk_start, this.#offset + this.size - chunk_start)
					);
					controller.close();
				} else {
					controller.enqueue(start_chunk.subarray(this.#offset - chunk_start));
					cursor = start_chunk.byteLength - this.#offset + chunk_start;
				}
			},
			pull: async (controller) => {
				chunk_index++;
				let chunk = await this.#get_chunk(chunk_index);
				if (!chunk) {
					controller.error('incomplete file data');
					controller.close();
					return;
				}
				if (chunk.byteLength > this.size - cursor) {
					chunk = chunk.subarray(0, this.size - cursor);
				}
				controller.enqueue(chunk);
				cursor += chunk.byteLength;
				if (cursor >= this.size) {
					controller.close();
				}
			}
		});
	}
	async text() {
		return text_decoder.decode(await this.arrayBuffer());
	}
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
 * Check if a property key is dangerous and could lead to prototype pollution
 * @param {string} key
 */
function check_prototype_pollution(key) {
	if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
		throw new Error(
			`Invalid key "${key}"` +
				(DEV ? ': This key is not allowed to prevent prototype pollution.' : '')
		);
	}
}

/**
 * Sets a value in a nested object using an array of keys, mutating the original object.
 * @param {Record<string, any>} object
 * @param {string[]} keys
 * @param {any} value
 */
export function deep_set(object, keys, value) {
	let current = object;

	for (let i = 0; i < keys.length - 1; i += 1) {
		const key = keys[i];

		check_prototype_pollution(key);

		const is_array = /^\d+$/.test(keys[i + 1]);
		const inner = Object.hasOwn(current, key) ? current[key] : undefined;
		const exists = inner != null;

		if (exists && is_array !== Array.isArray(inner)) {
			throw new Error(`Invalid array key ${keys[i + 1]}`);
		}

		if (!exists) {
			if (value === DELETE_KEY) {
				// don't create the nested structure if we want to delete the key anyway
				return;
			}
			current[key] = is_array ? [] : {};
		}

		current = current[key];
	}

	const final_key = keys[keys.length - 1];
	check_prototype_pollution(final_key);

	if (value === DELETE_KEY) {
		delete current[final_key];
	} else {
		current[final_key] = value;
	}
}

/**
 * @param {StandardSchemaV1.Issue} issue
 * @param {boolean} server Whether this issue came from server validation
 */
export function normalize_issue(issue, server = false) {
	/** @type {InternalRemoteFormIssue} */
	const normalized = { name: '', path: [], message: issue.message, server };

	if (issue.path !== undefined) {
		let name = '';

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
		}

		normalized.name = name;
	}

	return normalized;
}

/**
 * @param {InternalRemoteFormIssue[]} issues
 */
export function flatten_issues(issues) {
	/** @type {Record<string, InternalRemoteFormIssue[]>} */
	const result = {};

	for (const issue of issues) {
		(result.$ ??= []).push(issue);

		let name = '';

		if (issue.path !== undefined) {
			for (const key of issue.path) {
				if (typeof key === 'number') {
					name += `[${key}]`;
				} else if (typeof key === 'string') {
					name += name === '' ? key : '.' + key;
				}

				(result[name] ??= []).push(issue);
			}
		}
	}

	return result;
}

/**
 * Gets a nested value from an object using a path array
 * @param {Record<string, any>} object
 * @param {(string | number)[]} path
 * @returns {any}
 */

export function deep_get(object, path) {
	let current = object;
	for (const key of path) {
		if (current == null || typeof current !== 'object') {
			return current;
		}
		current = current[key];
	}
	return current;
}

/**
 *
 * @param {string} field_type
 * @param {boolean} is_array
 * @param {unknown} input_value
 */
function get_type_prefix(field_type, is_array, input_value) {
	if (field_type === 'number' || field_type === 'range') return 'n:';
	if (field_type === 'checkbox' && !is_array) return 'b:';
	if (field_type === 'hidden' || field_type === 'submit') {
		const input_type = typeof input_value;
		if (input_type === 'number') return 'n:';
		if (input_type === 'boolean') return 'b:';
	}
	return '';
}

/**
 * A deep-clone implementation specifically for form data, where
 * we don't need to worry about cycles and whatnot
 * @param {any} value
 * @returns {any}
 */
function deep_clone(value) {
	if (value !== null && typeof value === 'object') {
		if (value instanceof Date) {
			return new Date(value.getTime());
		}

		if (value instanceof File) {
			return value;
		}

		if (Array.isArray(value)) {
			return value.map(deep_clone);
		}

		/** @type {Record<string, any>} */
		const clone = {};
		for (const key of Object.keys(value)) {
			clone[key] = deep_clone(value[key]);
		}

		return clone;
	}

	return value;
}

/**
 * Creates a proxy-based field accessor for form data
 * @param {{
 * 	form_id: string,
 * 	get: () => Record<string, any>,
 * 	set: (path: (string | number)[], value: any) => void,
 * 	get_issues: (path?: (string | number)[], all?: boolean) => Record<string, InternalRemoteFormIssue[]>,
 * 	get_touched: () => Record<string, boolean>,
 * 	get_dirty: () => Record<string, boolean>
 * }} context - Form context, including value accessors and form metadata
 * @param {any} target - Function or empty POJO
 * @param {(string | number)[]} path - Current access path
 * @returns {any} Proxy object with name(), value(), and issues() methods
 */
export function create_field_proxy(context, target = {}, path = []) {
	const get_value = () => {
		const value = deep_get(context.get(), path);
		return deep_clone(value);
	};

	return new Proxy(target, {
		get(target, prop) {
			if (typeof prop === 'symbol') return target[prop];

			// Handle array access like jobs[0]
			if (/^\d+$/.test(prop)) {
				return create_field_proxy(context, {}, [...path, parseInt(prop, 10)]);
			}

			const key = build_path_string(path);
			const next = [...path, prop];

			if (prop === 'set') {
				const set_func = function (/** @type {any} */ newValue) {
					context.set(path, newValue);
					return newValue;
				};
				return create_field_proxy(context, set_func, next);
			}

			if (prop === 'value') {
				return create_field_proxy(context, get_value, next);
			}

			if (prop === 'issues' || prop === 'allIssues') {
				const issues_func = () => {
					const all_issues = context.get_issues(path, prop === 'allIssues')[key === '' ? '$' : key];

					if (prop === 'allIssues') {
						return all_issues?.map((issue) => ({
							path: issue.path,
							message: issue.message
						}));
					}

					const issues = all_issues
						?.filter((issue) => issue.name === key)
						?.map((issue) => ({
							path: issue.path,
							message: issue.message
						}));

					return issues?.length ? issues : undefined;
				};

				return create_field_proxy(context, issues_func, next);
			}

			if (prop === 'touched' || prop === 'dirty') {
				const fn = () => {
					const object = prop === 'dirty' ? context.get_dirty() : context.get_touched();

					if (key === '') {
						return Object.keys(object).length > 0;
					}

					if (Object.hasOwn(object, key)) {
						return true;
					}

					for (const candidate in object) {
						if (!Object.hasOwn(object, candidate)) continue;
						if (!candidate.startsWith(key)) continue;

						const next = candidate[key.length];
						if (next === '.' || next === '[') {
							return true;
						}
					}

					return false;
				};

				return create_field_proxy(context, fn, next);
			}

			if (prop === 'as') {
				/**
				 * @param {string} type
				 * @param {unknown} [input_value]
				 */
				const as_func = (type, input_value) => {
					const is_array =
						type === 'file multiple' ||
						type === 'select multiple' ||
						(type === 'checkbox' && typeof input_value === 'string');

					const type_prefix = get_type_prefix(type, is_array, input_value);

					// Base properties for all input types
					/** @type {Record<string, any>} */
					const base_props = {
						name: type_prefix + key + (is_array ? '[]' : '') + '/' + context.form_id,
						get 'aria-invalid'() {
							const issues = context.get_issues();
							return key in issues ? 'true' : undefined;
						}
					};

					// Add type attribute only for non-text inputs and non-select elements
					if (type !== 'text' && type !== 'select' && type !== 'select multiple') {
						base_props.type = type === 'file multiple' ? 'file' : type;
					}

					// Handle submit and hidden inputs
					if (type === 'submit' || type === 'hidden') {
						if (DEV) {
							if (input_value === null || input_value === undefined) {
								throw new Error(`\`${type}\` inputs must have a value`);
							}
						}

						const value =
							typeof input_value === 'boolean' ? (input_value ? 'on' : 'off') : input_value;

						return Object.defineProperties(base_props, {
							value: { value, enumerable: true }
						});
					}

					// Handle select inputs
					if (type === 'select' || type === 'select multiple') {
						return Object.defineProperties(base_props, {
							multiple: { value: is_array, enumerable: true },
							value: {
								enumerable: true,
								get() {
									return get_value() ?? input_value;
								}
							}
						});
					}

					// Handle checkbox inputs
					if (type === 'checkbox' || type === 'radio') {
						if (DEV) {
							if (type === 'radio' && !input_value) {
								throw new Error('Radio inputs must have a value');
							}

							if (type === 'checkbox' && is_array && !input_value) {
								throw new Error('Checkbox array inputs must have a value');
							}
						}

						if (type === 'checkbox' && !is_array) {
							return Object.defineProperties(base_props, {
								defaultChecked: {
									enumerable: true,
									get() {
										return input_value;
									}
								},
								checked: {
									enumerable: true,
									get() {
										return get_value() ?? input_value;
									}
								}
							});
						}

						return Object.defineProperties(base_props, {
							value: { value: input_value ?? 'on', enumerable: true },
							checked: {
								enumerable: true,
								get() {
									const value = get_value();

									if (type === 'radio') {
										return value === input_value;
									}

									return (value ?? []).includes(input_value);
								}
							}
						});
					}

					// Handle file inputs
					if (type === 'file' || type === 'file multiple') {
						return Object.defineProperties(base_props, {
							multiple: { value: is_array, enumerable: true },
							files: {
								enumerable: true,
								get() {
									const value = get_value();

									// Convert File/File[] to FileList-like object
									if (value instanceof File) {
										// In browsers, we can create a proper FileList using DataTransfer
										if (typeof DataTransfer !== 'undefined') {
											const fileList = new DataTransfer();
											fileList.items.add(value);
											return fileList.files;
										}
										// Fallback for environments without DataTransfer
										return { 0: value, length: 1 };
									}

									if (Array.isArray(value) && value.every((f) => f instanceof File)) {
										if (typeof DataTransfer !== 'undefined') {
											const fileList = new DataTransfer();
											value.forEach((file) => fileList.items.add(file));
											return fileList.files;
										}
										// Fallback for environments without DataTransfer
										/** @type {any} */
										const fileListLike = { length: value.length };
										value.forEach((file, index) => {
											fileListLike[index] = file;
										});
										return fileListLike;
									}

									return null;
								}
							}
						});
					}

					// Handle all other input types (text, number, etc.)
					return Object.defineProperties(base_props, {
						defaultValue: {
							enumerable: true,
							get() {
								return input_value;
							}
						},
						value: {
							enumerable: true,
							get() {
								const value = get_value() ?? input_value;
								return value != null ? String(value) : '';
							}
						}
					});
				};

				return create_field_proxy(context, as_func, next);
			}

			// Handle property access (nested fields)
			return create_field_proxy(context, {}, next);
		}
	});
}

/**
 * Builds a path string from an array of path segments
 * @param {(string | number)[]} path
 * @returns {string}
 */
export function build_path_string(path) {
	let result = '';

	for (const segment of path) {
		if (typeof segment === 'number') {
			result += `[${segment}]`;
		} else {
			result += result === '' ? segment : '.' + segment;
		}
	}

	return result;
}
