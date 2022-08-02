export function GET() {
	return new Response('ok', {
		headers: {
			'x-foo': 'bar'
		}
	});
}
