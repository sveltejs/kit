/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	return { url: url.toString() };
}
