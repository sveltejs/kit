/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return params;
}
