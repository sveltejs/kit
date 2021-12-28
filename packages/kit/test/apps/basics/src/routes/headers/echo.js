/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ headers }) {
	return {
		body: headers
	};
}
