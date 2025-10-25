/** @import { RemoteForm } from '@sveltejs/kit' */
/** @import { InternalRemoteFormIssue } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

import { DEV } from 'esm-env';

/**
 * Sets a value in a nested object using a path string, mutating the original object
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

	deep_set(object, split_path(path_string), value);
}

/**
 * Convert `FormData` into a POJO
 * @param {FormData} data
 */
export function convert_formdata(data) {
	/** @type {Record<string, any>} */
	const result = {};

	for (let key of data.keys()) {
		if (key.startsWith('sveltekit:')) {
			continue;
		}

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

		set_nested_value(result, key, is_array ? values : values[0]);
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
		const exists = key in current;
		const inner = current[key];

		if (exists && is_array !== Array.isArray(inner)) {
			throw new Error(`Invalid array key ${keys[i + 1]}`);
		}

		if (!exists) {
			current[key] = is_array ? [] : {};
		}

		current = current[key];
	}

	const final_key = keys[keys.length - 1];
	check_prototype_pollution(final_key);
	current[final_key] = value;
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
 * Creates a proxy-based field accessor for form data
 * @param {any} target - Function or empty POJO
 * @param {() => Record<string, any>} get_input - Function to get current input data
 * @param {(path: (string | number)[], value: any) => void} set_input - Function to set input data
 * @param {() => Record<string, InternalRemoteFormIssue[]>} get_issues - Function to get current issues
 * @param {(string | number)[]} path - Current access path
 * @returns {any} Proxy object with name(), value(), and issues() methods
 */
export function create_field_proxy(target, get_input, set_input, get_issues, path = []) {
	const get_value = () => {
		return deep_get(get_input(), path);
	};

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
				return create_field_proxy(get_value, get_input, set_input, get_issues, [...path, prop]);
			}

			if (prop === 'issues' || prop === 'allIssues') {
				const issues_func = () => {
					const all_issues = get_issues()[key === '' ? '$' : key];

					if (prop === 'allIssues') {
						return all_issues?.map((issue) => ({
							path: issue.path,
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
				 * @param {string} type
				 * @param {string} [input_value]
				 */
				const as_func = (type, input_value) => {
					const is_array =
						type === 'file multiple' ||
						type === 'select multiple' ||
						(type === 'checkbox' && typeof input_value === 'string');

					const prefix =
						type === 'number' || type === 'range'
							? 'n:'
							: type === 'checkbox' && !is_array
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
					if (type !== 'text' && type !== 'select' && type !== 'select multiple') {
						base_props.type = type === 'file multiple' ? 'file' : type;
					}

					// Handle submit and hidden inputs
					if (type === 'submit' || type === 'hidden') {
						if (DEV) {
							if (!input_value) {
								throw new Error(`\`${type}\` inputs must have a value`);
							}
						}

						return Object.defineProperties(base_props, {
							value: { value: input_value, enumerable: true }
						});
					}

					// Handle select inputs
					if (type === 'select' || type === 'select multiple') {
						return Object.defineProperties(base_props, {
							multiple: { value: is_array, enumerable: true },
							value: {
								enumerable: true,
								get() {
									return get_value();
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

						return Object.defineProperties(base_props, {
							value: { value: input_value ?? 'on', enumerable: true },
							checked: {
								enumerable: true,
								get() {
									const value = get_value();

									if (type === 'radio') {
										return value === input_value;
									}

									if (is_array) {
										return (value ?? []).includes(input_value);
									}

									return value;
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
						value: {
							enumerable: true,
							get() {
								const value = get_value();
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

/**
 * @param {RemoteForm<any, any>} instance
 * @deprecated remove in 3.0
 */
export function throw_on_old_property_access(instance) {
	Object.defineProperty(instance, 'field', {
		value: (/** @type {string} */ name) => {
			const new_name = name.endsWith('[]') ? name.slice(0, -2) : name;
			throw new Error(
				`\`form.field\` has been removed: Instead of \`<input name={form.field('${name}')} />\` do \`<input {...form.fields.${new_name}.as(type)} />\``
			);
		}
	});

	for (const property of ['input', 'issues']) {
		Object.defineProperty(instance, property, {
			get() {
				const new_name = property === 'issues' ? 'issues' : 'value';
				return new Proxy(
					{},
					{
						get(_, prop) {
							const prop_string = typeof prop === 'string' ? prop : String(prop);
							const old =
								prop_string.includes('[') || prop_string.includes('.')
									? `['${prop_string}']`
									: `.${prop_string}`;
							const replacement = `.${prop_string}.${new_name}()`;
							throw new Error(
								`\`form.${property}\` has been removed: Instead of \`form.${property}${old}\` write \`form.fields${replacement}\``
							);
						}
					}
				);
			}
		});
	}
}
