/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return {
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: new ReadableStream({
			pull() {
				throw Error('simulate error');
			}
		})
	};
}
