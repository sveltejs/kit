import file_path from '../test.txt?url';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ fetch }) {
	const response = await fetch(file_path);

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('Content-Type')
		}
	});
}
