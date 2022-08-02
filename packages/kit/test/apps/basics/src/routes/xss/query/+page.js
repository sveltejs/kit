/** @typedef {Record<string, string[]>} Query */

/** @param {URLSearchParams} query */
function to_pojo(query) {
	/** @type {Query}*/
	const values = {};

	query.forEach((value, key) => {
		if (!(key in values)) values[key] = [];
		values[key].push(value);
	});

	return values;
}

/** @type {import('@sveltejs/kit').Load} */
export function load({ url }) {
	return {
		values: to_pojo(url.searchParams)
	};
}
