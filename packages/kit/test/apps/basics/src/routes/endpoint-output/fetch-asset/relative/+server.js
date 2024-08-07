import image from '../image.png';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch }) {
	console.log('🚀 ~ image:', image);

	const response = await fetch(image);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('Content-Type')
		}
	});
}
