/** @type {import('./$types').PageServerLoad} */
export function load({ url }) {
	return { url: url.toString() };
}
