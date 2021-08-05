/** @param {Record<string, string>} obj */
export function lowercase_keys(obj) {
	/** @type {Record<string, string>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}
