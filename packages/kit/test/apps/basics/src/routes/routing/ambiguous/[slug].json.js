/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET(req) {
	return { body: req.params.slug };
}
