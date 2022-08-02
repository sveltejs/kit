/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response(undefined, {
		headers: {
			'Set-Cookie': 'foo=bar'
		}
	});
}
