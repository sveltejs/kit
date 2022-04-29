/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	const text = await request.text();
	const json = JSON.parse(text);

	return {
		body: {
			body: json,
			rawBody: text
		}
	};
}
