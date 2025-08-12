export function load({ url }) {
	const values = {};

	for (const key of url.searchParams.keys()) {
		values[key] = url.searchParams.get(key);
	}

	return {
		values
	};
}
