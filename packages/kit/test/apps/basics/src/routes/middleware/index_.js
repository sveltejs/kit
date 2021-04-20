/** @type {import('@sveltejs/kit').RequestHandler} */
export function get(request) {
	if (request.headers.accept === 'application/json') {
		return { body: { json: true } };
	}
}
