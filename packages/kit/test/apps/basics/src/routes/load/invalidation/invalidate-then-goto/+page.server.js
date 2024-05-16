/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	url.searchParams.get('x');
	return {
		pageDate: new Date().getTime()
	};
}
