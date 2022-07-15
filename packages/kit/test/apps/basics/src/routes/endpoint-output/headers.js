/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return {
		headers: {
			'Set-Cookie': 'foo=bar'
		}
	};
}
