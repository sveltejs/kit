import image from '../image.png';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ url }) {
	const absolute = new URL(image, url.origin);

	const response = await fetch(absolute);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('Content-Type')
		}
	});
}
