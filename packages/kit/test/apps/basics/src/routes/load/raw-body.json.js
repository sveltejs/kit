/** @type {import('@sveltejs/kit').RequestHandler} */
export function post(request) {
	return {
		body: {
			body: /** @type {string} */ (request.body),
			rawBody: /** @type {string} */ (request.rawBody)
		}
	};
}
