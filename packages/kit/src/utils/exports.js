/**
 * @param {string[]} expected
 */
function validator(expected) {
	const set = new Set(expected);

	/**
	 * @param {any} module
	 * @param {string} [route_id]
	 */
	function validate(module, route_id) {
		if (!module) return;

		for (const key in module) {
			if (key[0] === '_' || set.has(key)) continue; // key is valid in this module

			const hint =
				hint_for_supported_files(key) ||
				`valid exports are ${expected.join(', ')}, or anything with a '_' prefix`;

			throw new Error(`Invalid export '${key}'${route_id ? ` in ${route_id}` : ''} (${hint})`);
		}
	}

	return validate;
}

/**
 * @param {string} key
 * @returns {string | undefined} undefined, if no supported file is found
 */
function hint_for_supported_files(key) {
	let supported_files = [];

	if (valid_common_exports.includes(key)) {
		supported_files.push('+page.js');
	}

	if (valid_page_server_exports.includes(key)) {
		supported_files.push('+page.server.js');
	}

	if (valid_server_exports.includes(key)) {
		supported_files.push('+server.js');
	}

	if (supported_files.length > 0) {
		return `'${key}' is a valid export in '${supported_files.join(`' or '`)}'`;
	}

	return undefined;
}

const valid_common_exports = ['load', 'prerender', 'csr', 'ssr', 'trailingSlash', 'config'];
const valid_page_server_exports = [
	'load',
	'prerender',
	'csr',
	'ssr',
	'actions',
	'trailingSlash',
	'config'
];
const valid_server_exports = [
	'GET',
	'POST',
	'PATCH',
	'PUT',
	'DELETE',
	'OPTIONS',
	'prerender',
	'trailingSlash',
	'config'
];

export const validate_common_exports = validator(valid_common_exports);
export const validate_page_server_exports = validator(valid_page_server_exports);
export const validate_server_exports = validator(valid_server_exports);
