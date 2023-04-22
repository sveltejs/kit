export function GET() {
	return new Response('ok', {
		headers: {
			'content-disposition': 'attachment'
		}
	});
}
