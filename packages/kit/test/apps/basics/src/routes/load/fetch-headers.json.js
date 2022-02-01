/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ request }) {
	return {
		body: Object.fromEntries(request.headers)
	};
}
