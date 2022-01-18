/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {string} key
 * @returns {string | undefined}
 * @throws {Error}
 */
export function get_single_valued_header(headers, key) {
	const value = headers[key];
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return undefined;
		}
		if (value.length > 1) {
			throw new Error(
				`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`
			);
		}
		return value[0];
	}
	return value;
}

/** @param {Partial<import('types/helper').ResponseHeaders> | undefined} object */
export function to_headers(object) {
	const headers = new Headers();

	if (object) {
		for (const key in object) {
			const value = object[key];

			if (value) {
				if (typeof value === 'string') {
					headers.set(key, value);
				} else {
					value.forEach((value) => {
						headers.append(key, value);
					});
				}
			}
		}
	}

	return headers;
}
