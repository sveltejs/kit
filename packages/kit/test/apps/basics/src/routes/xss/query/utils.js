/** @typedef {Record<string, string[]>} Query */

/** @param {Pick<URLSearchParams, 'forEach'>} query */
export function to_pojo(query) {
	/** @type {Query}*/
	const values = {};

	query.forEach((value, key) => {
		if (!(key in values)) values[key] = [];
		values[key].push(value);
	});

	return values;
}
