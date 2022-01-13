/** @type {import('@sveltejs/kit').RequestHandler} */
export function get({ params }) {
	return {
		body: {
			parts: params.parts
		}
	};
}
