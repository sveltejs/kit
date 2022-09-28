/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	return {
		x: url.searchParams.get('x')
	};
}
