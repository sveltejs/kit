/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return new Response(
		JSON.stringify({
			parts: params.parts
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
