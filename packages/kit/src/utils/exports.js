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
			if (key[0] === '_' || set.has(key)) {
				continue; // valid
			}

			const valid = expected.join(', ');
			let error_hint = `(valid exports are ${valid}, or anything with a '_' prefix)`;

			if (valid_page_server_exports.includes(key)) {
				error_hint = `('${key}' is available in '+page.server.js')`;
			}

			if (valid_server_exports.includes(key)) {
				error_hint = `('${key}' is available in '+server.js')`;
			}

			throw new Error(`Invalid export '${key}'${route_id ? ` in ${route_id}` : ''} ${error_hint}`);
		}
	}

	return validate;
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
