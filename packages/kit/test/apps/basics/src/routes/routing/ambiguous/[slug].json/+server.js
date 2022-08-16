/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET(req) {
	return new Response(req.params.slug);
}
