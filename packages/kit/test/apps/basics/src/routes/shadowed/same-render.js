/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ url }) {
	return { body: { location: `${url.pathname}${url.search}` } };
}
