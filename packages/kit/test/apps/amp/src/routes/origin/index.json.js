/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	return {
		body: { origin: url.origin }
	};
}
