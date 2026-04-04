/** @type {import('./$types').LayoutServerLoad} */
export function load({ url }) {
	return {
		pathname: url.pathname
	};
}
