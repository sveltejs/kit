/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	return {
		a: url.searchParams.get('a')
	};
}
