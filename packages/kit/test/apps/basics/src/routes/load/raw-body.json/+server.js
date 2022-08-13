import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	const rawBody = await request.text();
	const body = JSON.parse(rawBody);

	return json({
		body,
		rawBody
	});
}
