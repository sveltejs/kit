/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	const body = await request.text();
	return new Response(body.toUpperCase());
}
