/** @type {import('@sveltejs/kit').RequestHandler} */
export function DELETE(req) {
	return new Response(
		JSON.stringify({
			id: req.params.id
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' }, status: 200 }
	);
}
