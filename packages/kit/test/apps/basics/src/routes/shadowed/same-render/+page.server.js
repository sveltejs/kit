/** @type {import('./$types').Get} */
export function GET({ url }) {
	return { url: url.toString() };
}
