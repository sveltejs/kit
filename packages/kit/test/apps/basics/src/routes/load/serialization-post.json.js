/** @type {import('@sveltejs/kit').RequestHandler<any, string>} */
export function post(request) {
	return {
		body: request.body.toUpperCase()
	};
}
