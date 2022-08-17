/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return new Response(params.rest);
}
