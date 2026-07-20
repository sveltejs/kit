export function GET() {
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream'
		}
	});
}
