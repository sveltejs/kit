/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return {
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: new ReadableStream({
			start: (controller) => {
				controller.enqueue(new Uint8Array([1, 2, 3]));
				controller.close();
			}
		})
	};
}
