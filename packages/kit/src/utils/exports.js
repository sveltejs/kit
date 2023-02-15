/**
 * @param {string[]} expected
 */
function validator(expected) {
	const set = new Set(expected);

	/**
	 * @param {any} module
	 * @param {string} [file]
	 */
	function validate(module, file) {
		if (!module) return;

		for (const key in module) {
			if (key[0] === '_' || set.has(key)) continue; // key is valid in this module

			const hint =
				hint_for_supported_files(key, file?.slice(file.lastIndexOf('.'))) ??
				`valid exports are ${expected.join(', ')}, or anything with a '_' prefix`;

			throw new Error(`Invalid export '${key}'${file ? ` in ${file}` : ''} (${hint})`);
		}
	}

	return validate;
}

/**
 * @param {string} key
 * @param {string} ext
 * @returns {string | void}
 */
function hint_for_supported_files(key, ext = '.js') {
	let supported_files = [];

	if (valid_common_exports.includes(key)) {
		supported_files.push(`+page${ext}`);
	}

	if (valid_page_server_exports.includes(key)) {
		supported_files.push(`+page.server${ext}`);
	}

	if (valid_server_exports.includes(key)) {
		supported_files.push(`+server${ext}`);
	}

	if (supported_files.length > 0) {
		return `'${key}' is a valid export in ${supported_files.join(` or `)}`;
	}
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
