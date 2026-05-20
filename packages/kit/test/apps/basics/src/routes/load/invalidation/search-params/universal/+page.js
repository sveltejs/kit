let count = 0;

/** @type {import("./$types").PageLoad} */
export function load({ url }) {
	url.searchParams.get('a');
	return {
		count: count++
	};
}
