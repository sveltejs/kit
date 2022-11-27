/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	return {
		q: url.searchParams.get('q')
	};
}
