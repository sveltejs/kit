import * as e from '../messages/shared-errors.js';
import { join_or } from './format.js';

/**
 * @param {Set<string>} expected
 */
function validator(expected) {
	/**
	 * @param {any} module
	 * @param {string} [file]
	 */
	function validate(module, file) {
		if (!module) return;

		for (const key in module) {
			if (key[0] === '_' || expected.has(key)) continue; // key is valid in this module

			const locations = valid_locations(key, file?.slice(file.lastIndexOf('.')));

			if (locations.length > 0) {
				e.invalid_export_location({ key, locations: join_or(locations), file: file || undefined });
			}

			e.invalid_export({
				key,
				exports: [...expected.values()].join(', '),
				file: file || undefined
			});
		}
	}

	return validate;
}

/**
 * Returns the route files in which `key` is a valid export
 * @param {string} key
 * @param {string} ext
 * @returns {string[]}
 */
function valid_locations(key, ext = '.js') {
	const locations = [];

	if (valid_layout_exports.has(key)) {
		locations.push(`+layout${ext}`);
	}

	if (valid_page_exports.has(key)) {
		locations.push(`+page${ext}`);
	}

	if (valid_layout_server_exports.has(key)) {
		locations.push(`+layout.server${ext}`);
	}

	if (valid_page_server_exports.has(key)) {
		locations.push(`+page.server${ext}`);
	}

	if (valid_server_exports.has(key)) {
		locations.push(`+server${ext}`);
	}

	return locations;
}

const valid_layout_exports = new Set([
	'load',
	'prerender',
	'csr',
	'ssr',
	'trailingSlash',
	'config'
]);
const valid_page_exports = new Set([...valid_layout_exports, 'entries']);
const valid_layout_server_exports = new Set([...valid_layout_exports]);
const valid_page_server_exports = new Set([...valid_layout_server_exports, 'actions', 'entries']);
const valid_server_exports = new Set([
	'GET',
	'POST',
	'PATCH',
	'PUT',
	'DELETE',
	'OPTIONS',
	'HEAD',
	'QUERY',
	'fallback',
	'prerender',
	'trailingSlash',
	'config',
	'entries'
]);

export const validate_layout_exports = validator(valid_layout_exports);
export const validate_page_exports = validator(valid_page_exports);
export const validate_layout_server_exports = validator(valid_layout_server_exports);
export const validate_page_server_exports = validator(valid_page_server_exports);
export const validate_server_exports = validator(valid_server_exports);
