/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return {
		body: {
			path: params.path
		}
	};
}
