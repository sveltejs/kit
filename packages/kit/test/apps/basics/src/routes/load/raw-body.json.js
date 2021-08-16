/** @type {import('@sveltejs/kit').RequestHandler} */
export function post(request) {
	return {
		body: {
			body: /** @type {string} */ (request.body),
			rawBody: new TextDecoder().decode(request.rawBody)
		}
	};
}
