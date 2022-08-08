/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return new Response(
		JSON.stringify({
			path: params.path
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
