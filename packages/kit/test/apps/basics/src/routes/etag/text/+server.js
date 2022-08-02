/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response('some text', {
		headers: {
			expires: 'yesterday'
		}
	});
}
