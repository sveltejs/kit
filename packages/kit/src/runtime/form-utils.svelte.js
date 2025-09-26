/** @import { RemoteFormIssue } from '@sveltejs/kit' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

/**
 * Sets a value in a nested object using a path string, not mutating the original object but returning a new object
 * @param {Record<string, any>} object
 * @param {string} path_string
 * @param {any} value
 */

export function set_nested_value(object, path_string, value) {
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
		let values = data.getAll(key);

		if (is_array) key = key.slice(0, -2);

		if (values.length > 1 && !is_array) {
			throw new Error(`Form cannot contain duplicated keys — "${key}" has ${values.length} values`);
		}

		// an empty `<input type="file">` will submit a non-existent file, bizarrely
		values = values.filter(
			(entry) => typeof entry === 'string' || entry.name !== '' || entry.size > 0
		);

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
 * @param {() => Record<string, RemoteFormIssue[]>} get_issues - Function to get current issues
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

			if (prop === 'value') {
				const value_func = function (/** @type {any} */ newValue) {
					if (arguments.length === 0) {
						// TODO Ideally we'd create a $derived just above and use it here but we can't because of push_reaction which prevents
						// changes to deriveds created within an effect to rerun the effect - an argument for
						// reverting that change in async mode?
						return deep_get(get_input(), path);
					} else {
						set_input(path, newValue);
						return newValue;
					}
				};
				return create_field_proxy(value_func, get_input, set_input, get_issues, [...path, 'value']);
			}

			if (prop === 'issues' || prop === 'allIssues') {
				const issues_func = () => {
					const all_issues = get_issues()[key === '' ? '$' : key];

					if (prop === 'allIssues') {
						return all_issues;
					}

					return all_issues?.filter((issue) => issue.name === key);
				};

				return create_field_proxy(issues_func, get_input, set_input, get_issues, [...path, prop]);
			}

			if (prop === 'as') {
				const as_func = (/** @type {string} */ inputType) => {
					const isArray = inputType.endsWith('[]');
					const baseType = isArray ? inputType.slice(0, -2) : inputType;

					// Base properties for all input types
					const baseProps = {
						type: baseType,
						name: key + (isArray ? '[]' : ''),
						get 'aria-invalid'() {
							const issues = get_issues();
							return key in issues ? 'true' : undefined;
						}
					};

					// Handle checkbox inputs
					if (baseType === 'checkbox' || baseType === 'radio') {
						// TODO correct for radio?
						return Object.defineProperties(baseProps, {
							checked: {
								get() {
									const input = get_input();
									const currentValue = deep_get(input, path);
									return Boolean(currentValue);
								},
								set(value) {
									set_input(path, Boolean(value));
								}
							}
						});
					}

					// Handle file inputs
					if (baseType === 'file') {
						return Object.defineProperties(baseProps, {
							files: {
								get() {
									const input = get_input();
									const currentValue = deep_get(input, path);
									// Convert File/File[] to FileList-like object
									if (currentValue instanceof File) {
										// In browsers, we can create a proper FileList using DataTransfer
										if (typeof DataTransfer !== 'undefined') {
											const fileList = new DataTransfer();
											fileList.items.add(currentValue);
											return fileList.files;
										}
										// Fallback for environments without DataTransfer
										return { 0: currentValue, length: 1 };
									}
									if (Array.isArray(currentValue) && currentValue.every((f) => f instanceof File)) {
										if (typeof DataTransfer !== 'undefined') {
											const fileList = new DataTransfer();
											currentValue.forEach((file) => fileList.items.add(file));
											return fileList.files;
										}
										// Fallback for environments without DataTransfer
										/** @type {any} */
										const fileListLike = { length: currentValue.length };
										currentValue.forEach((file, index) => {
											fileListLike[index] = file;
										});
										return fileListLike;
									}
									return null;
								},
								set(fileList) {
									if (!fileList) {
										set_input(path, isArray ? [] : null);
										return;
									}
									const files = Array.from(fileList);
									set_input(path, isArray ? files : files[0] || null);
								}
							}
						});
					}

					// Handle all other input types (text, number, etc.)
					return Object.defineProperties(baseProps, {
						value: {
							enumerable: true,
							get() {
								const input = get_input();
								const currentValue = deep_get(input, path);
								if (isArray && Array.isArray(currentValue)) {
									return currentValue.join(',');
								}
								return currentValue != null ? String(currentValue) : '';
							},
							set(newValue) {
								if (isArray) {
									// For array inputs, split comma-separated values
									const values = String(newValue)
										.split(',')
										.map((v) => v.trim())
										.filter(Boolean);
									if (baseType === 'number') {
										set_input(path, values.map(Number));
									} else {
										set_input(path, values);
									}
								} else {
									if (baseType === 'number') {
										set_input(path, Number(newValue));
									} else {
										set_input(path, String(newValue));
									}
								}
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
