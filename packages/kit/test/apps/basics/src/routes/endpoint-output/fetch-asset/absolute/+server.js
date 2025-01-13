import file_path from '../test.txt?url';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ url }) {
	const absolute = new URL(file_path, url.origin);

	const response = await fetch(absolute);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('Content-Type')
		}
	});
}
