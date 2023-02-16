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
			if (key[0] !== '_' && !set.has(key)) {
				const valid = expected.join(', ');
				throw new Error(
					`Invalid export '${key}'${
						route_id ? ` in ${route_id}` : ''
					} (valid exports are ${valid}, or anything with a '_' prefix)`
				);
			}
		}
	}

	return validate;
}

export const validate_common_exports = validator([
	'load',
	'prerender',
	'csr',
	'ssr',
	'trailingSlash',
	'config'
]);

export const validate_page_server_exports = validator([
	'load',
	'prerender',
	'csr',
	'ssr',
	'actions',
	'trailingSlash',
	'config'
]);

export const validate_server_exports = validator([
	'GET',
	'POST',
	'PATCH',
	'PUT',
	'DELETE',
	'prerender',
	'trailingSlash',
	'config'
]);
