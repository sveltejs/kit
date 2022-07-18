/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET(request) {
	return {
		body: {
			name: request.locals.name
		}
	};
}
