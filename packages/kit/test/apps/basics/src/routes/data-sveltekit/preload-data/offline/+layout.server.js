/** @type {import('./$types').LayoutServerLoad} */
export function load({ url }) {
	return {
		url: url.toString()
	};
}
