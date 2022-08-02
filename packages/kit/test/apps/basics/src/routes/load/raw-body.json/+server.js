/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	const text = await request.text();
	const json = JSON.parse(text);

	return new Response(
		JSON.stringify({
			body: json,
			rawBody: text
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
