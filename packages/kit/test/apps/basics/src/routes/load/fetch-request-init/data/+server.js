import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function fallback({ request }) {
	return json({
		method: request.method,
		body: await request.text(),
		headers: Object.fromEntries(request.headers)
	});
}
