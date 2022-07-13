/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	return { body: { url: url.toString() } };
}
