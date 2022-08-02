/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET(request) {
	return new Response(
		JSON.stringify({
			name: request.locals.name
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
