let count = 0;

/** @type {import("./$types").PageServerLoad} */
export function load({ url }) {
	if (url.searchParams.has('reset')) count = 0;
	url.searchParams.get('a');
	return {
		count: count++
	};
}
