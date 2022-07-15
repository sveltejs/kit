/** @type {import('@sveltejs/kit').RequestHandler} */
export function DELETE(req) {
	return {
		status: 200,
		body: {
			id: req.params.id
		}
	};
}
