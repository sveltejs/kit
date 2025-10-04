/** @import { InternalRemoteFormIssue } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

import { DEV } from 'esm-env';

/**
 * Sets a value in a nested object using a path string, not mutating the original object but returning a new object
 * @param {Record<string, any>} object
 * @param {string} path_string
 * @param {any} value
 */
export function set_nested_value(object, path_string, value) {
	if (path_string.startsWith('n:')) {
		path_string = path_string.slice(2);
		value = value === '' ? undefined : parseFloat(value);
	} else if (path_string.startsWith('b:')) {
		path_string = path_string.slice(2);
		value = value === 'on';
	}

	return deep_set(object, split_path(path_string), value);
}

/**
 * Convert `FormData` into a POJO
 * @param {FormData} data
 */
export function convert_formdata(data) {
	/** @type {Record<string, any>} */
	let result = Object.create(null); // guard against prototype pollution

	for (let key of data.keys()) {
		const is_array = key.endsWith('[]');
		/** @type {any[]} */
		let values = data.getAll(key);

		if (is_array) key = key.slice(0, -2);

		if (values.length > 1 && !is_array) {
			throw new Error(`Form cannot contain duplicated keys — "${key}" has ${values.length} values`);
		}

		// an empty `<input type="file">` will submit a non-existent file, bizarrely
		values = values.filter(
			(entry) => typeof entry === 'string' || entry.name !== '' || entry.size > 0
		);

		if (key.startsWith('n:')) {
			key = key.slice(2);
			values = values.map((v) => (v === '' ? undefined : parseFloat(/** @type {string} */ (v))));
		} else if (key.startsWith('b:')) {
			key = key.slice(2);
			values = values.map((v) => v === 'on');
		}

		result = set_nested_value(result, key, is_array ? values : values[0]);
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
 * Sets a value in a nested object using an array of keys.
 * Does not mutate the original object; returns a new object.
 * @param {Record<string, any>} object
 * @param {string[]} keys
 * @param {any} value
 */
export function deep_set(object, keys, value) {
	const result = Object.assign(Object.create(null), object); // guard against prototype pollution
	let current = result;

	for (let i = 0; i < keys.length - 1; i += 1) {
		const key = keys[i];
		const is_array = /^\d+$/.test(keys[i + 1]);
		const exists = key in current;
		const inner = current[key];

		if (exists && is_array !== Array.isArray(inner)) {
			throw new Error(`Invalid array key ${keys[i + 1]}`);
		}

		current[key] = is_array
			? exists
				? [...inner]
				: []
			: // guard against prototype pollution
				Object.assign(Object.create(null), inner);

		current = current[key];
	}

	current[keys[keys.length - 1]] = value;
	return result;
}

/**
 * @param {readonly StandardSchemaV1.Issue[]} issues
 * @param {boolean} [server=false] - Whether these issues come from server validation
 */
export function flatten_issues(issues, server = false) {
	/** @type {Record<string, InternalRemoteFormIssue[]>} */
	const result = {};

	for (const issue of issues) {
		/** @type {InternalRemoteFormIssue} */
		const normalized = { name: '', path: [], message: issue.message, server };

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
 * Creates a proxy-based field accessor for form data
 * @param {any} target - Function or empty POJO
 * @param {() => Record<string, any>} get_input - Function to get current input data
 * @param {(path: (string | number)[], value: any) => void} set_input - Function to set input data
 * @param {() => Record<string, InternalRemoteFormIssue[]>} get_issues - Function to get current issues
 * @param {(string | number)[]} path - Current access path
 * @returns {any} Proxy object with name(), value(), and issues() methods
 */
export function create_field_proxy(target, get_input, set_input, get_issues, path = []) {
	return new Proxy(target, {
		get(target, prop) {
			if (typeof prop === 'symbol') return target[prop];

			// Handle array access like jobs[0]
			if (/^\d+$/.test(prop)) {
				return create_field_proxy({}, get_input, set_input, get_issues, [
					...path,
					parseInt(prop, 10)
				]);
			}

			const key = build_path_string(path);

			if (prop === 'set') {
				const set_func = function (/** @type {any} */ newValue) {
					set_input(path, newValue);
					return newValue;
				};
				return create_field_proxy(set_func, get_input, set_input, get_issues, [...path, prop]);
			}

			if (prop === 'value') {
				const value_func = function () {
					// TODO Ideally we'd create a $derived just above and use it here but we can't because of push_reaction which prevents
					// changes to deriveds created within an effect to rerun the effect - an argument for
					// reverting that change in async mode?
					// TODO we did that in Svelte now; bump Svelte version and use $derived here
					return deep_get(get_input(), path);
				};
				return create_field_proxy(value_func, get_input, set_input, get_issues, [...path, prop]);
			}

			if (prop === 'issues' || prop === 'allIssues') {
				const issues_func = () => {
					const all_issues = get_issues()[key === '' ? '$' : key];

					if (prop === 'allIssues') {
						return all_issues?.map((issue) => ({
							message: issue.message
						}));
					}

					return all_issues
						?.filter((issue) => issue.name === key)
						?.map((issue) => ({
							message: issue.message
						}));
				};

				return create_field_proxy(issues_func, get_input, set_input, get_issues, [...path, prop]);
			}

			if (prop === 'as') {
				/**
				 * @param {string} input_type
				 * @param {string} [checkbox_value]
				 */
				const as_func = (input_type, checkbox_value) => {
					const is_array = input_type.endsWith('[]');
					const base_type = is_array ? input_type.slice(0, -2) : input_type;

					const prefix =
						base_type === 'number' || base_type === 'range'
							? 'n:'
							: input_type === 'checkbox' && !is_array
								? 'b:'
								: '';

					// Base properties for all input types
					/** @type {Record<string, any>} */
					const base_props = {
						name: prefix + key + (is_array ? '[]' : ''),
						get 'aria-invalid'() {
							const issues = get_issues();
							return key in issues ? 'true' : undefined;
						}
					};

					// Add type attribute only for non-text inputs and non-select elements
					if (base_type !== 'text' && base_type !== 'select' && base_type !== 'multiselect') {
						base_props.type = base_type;
					}

					// Handle select inputs
					if (base_type === 'select') {
						return Object.defineProperties(base_props, {
							multiple: { value: is_array, enumerable: true },
							value: {
								enumerable: true,
								get() {
									const input = get_input();
									return deep_get(input, path);
								}
							}
						});
					}

					// Handle checkbox inputs
					if (base_type === 'checkbox' || base_type === 'radio') {
						if (DEV && base_type === 'radio' && is_array) {
							throw new Error('Radio inputs cannot be arrays');
						}
						if (DEV && base_type === 'checkbox' && is_array && !checkbox_value) {
							throw new Error('Checkbox array inputs must have a value');
						}

						return Object.defineProperties(base_props, {
							// TODO should we do this for normal radio, too?
							value: { value: checkbox_value ?? 'on', enumerable: true },
							checked: {
								enumerable: true,
								get() {
									const input = get_input();
									const value = deep_get(input, path);
									return is_array ? (value ?? []).includes(checkbox_value) : value;
								}
							}
						});
					}

					// Handle file inputs
					if (base_type === 'file') {
						return Object.defineProperties(base_props, {
							files: {
								enumerable: true,
								get() {
									const input = get_input();
									const value = deep_get(input, path);

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
						value: {
							enumerable: true,
							get() {
								const input = get_input();
								const value = deep_get(input, path);
								if (is_array && Array.isArray(value)) {
									// TODO incorrect - how do we know which index this is? Do we have to forbid [] generally for everything except checkbox?
									return value.join(',');
								}
								return value != null ? String(value) : '';
							}
						}
					});
				};

				return create_field_proxy(as_func, get_input, set_input, get_issues, [...path, 'as']);
			}

			// Handle property access (nested fields)
			return create_field_proxy({}, get_input, set_input, get_issues, [...path, prop]);
		}
	});
}

/**
 * Builds a path string from an array of path segments
 * @param {(string | number)[]} path
 * @returns {string}
 */
function build_path_string(path) {
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
