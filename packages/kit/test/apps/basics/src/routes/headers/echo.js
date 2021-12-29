/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ headers }) {
	delete headers.cookie;

	return {
		body: headers
	};
}
