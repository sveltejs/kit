/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	/** @type {Record<string, string | null>} */
	const values = {};

	for (const key of url.searchParams.keys()) {
		values[key] = url.searchParams.get(key);
	}

	return {
		values
	};
}
