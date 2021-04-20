/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ host }) {
	return {
		body: { host }
	};
}
