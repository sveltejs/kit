/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response(new Uint8Array([1, 2, 3, 4, 5]), {
		headers: {
			'content-type': 'application/octet-stream'
		}
	});
}
