/** @type {import('./$types').GET} */
export function GET({ url }) {
	return { url: url.toString() };
}
