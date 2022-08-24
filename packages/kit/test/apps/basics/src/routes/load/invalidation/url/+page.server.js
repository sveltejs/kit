/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	return {
		a: url.searchParams.get('a')
	};
}
