/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response(
		new ReadableStream({
			pull() {
				throw Error('simulate error');
			}
		}),
		{
			headers: {
				'content-type': 'application/octet-stream'
			}
		}
	);
}
