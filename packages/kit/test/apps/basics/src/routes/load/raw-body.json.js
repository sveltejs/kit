/** @type {import('@sveltejs/kit').RequestHandler} */
export function post(request) {
	console.log('raw body:', request.rawBody, TextDecoder);
	return {
		body: {
			body: /** @type {string} */ (request.body),
			rawBody: new TextDecoder().decode(request.rawBody)
		}
	};
}
