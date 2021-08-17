/** @type {import('@sveltejs/kit').RequestHandler} */
export function post(request) {
	return {
		body: {
			body: /** @type {string} */ (request.body),
			rawBody: new TextDecoder().decode(/** @type {Uint8Array} */ (request.rawBody))
		}
	};
}
