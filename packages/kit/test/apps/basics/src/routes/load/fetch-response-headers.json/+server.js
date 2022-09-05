/** @type {import('./$types').RequestHandler} */
export function GET() {
	return new Response('ok', {
		headers: {
			'x-foo': 'this should not appear'
		}
	});
}
