export function GET() {
	return new Response('data: hello\n\n', {
		headers: {
			'content-type': 'text/event-stream'
		}
	});
}
