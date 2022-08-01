/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	return new Response(JSON.stringify({ origin: url.origin }));
}
