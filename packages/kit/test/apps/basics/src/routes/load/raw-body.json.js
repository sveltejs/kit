/** @type {import('../../../../../../types').RequestHandler} */
export function post(request) {
	return {
		body: {
			body: request.body,
			rawBody: request.rawBody
		}
	};
}
