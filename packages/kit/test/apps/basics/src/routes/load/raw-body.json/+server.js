import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	const content_type = request.headers.get('content-type');

	let rawBody;
	if (
		content_type?.startsWith('multipart/form-data') ||
		content_type?.startsWith('application/x-www-form-urlencoded')
	) {
		const formData = await request.formData();
		rawBody = /** @type {string} */ (formData.get('data'));
	} else {
		rawBody = await request.text();
	}

	const body = JSON.parse(rawBody);

	return json({
		body,
		rawBody
	});
}
