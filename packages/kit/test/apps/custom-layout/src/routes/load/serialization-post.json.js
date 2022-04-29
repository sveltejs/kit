/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	const body = await request.text();

	return {
		body: body.toUpperCase()
	};
}
