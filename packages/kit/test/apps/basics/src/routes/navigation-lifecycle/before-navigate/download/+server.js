export function GET() {
	return new Response('ok', {
		headers: {
			'Content-Disposition': 'attachment'
		}
	});
}
