/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	url.search; // force rerun on every query change
	return {
		pageRandom: Math.random()
	};
}
