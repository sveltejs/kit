/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ origin }) {
	return {
		body: { origin }
	};
}
