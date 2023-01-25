/** @type {import('./$types').LayoutLoad} */
export async function load({ url }) {
	url.pathname; // force rerun on every page change
	return {
		random: Math.random()
	};
}
