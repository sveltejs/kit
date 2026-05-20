let count = 0;

/** @type {import("./$types").PageServerLoad} */
export function load({ url }) {
	url.searchParams.get('a');
	return {
		count: count++
	};
}
