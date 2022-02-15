/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ url }) {
	return { body: { url: url.toString() } };
}
