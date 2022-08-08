let errorName = 'null';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	if (url.searchParams.has('what')) {
		const body = errorName;
		errorName = 'null';
		return new Response(body);
	}

	return new Response(
		new ReadableStream({
			pull(controller) {
				controller.enqueue(42);
			},

			cancel(reason) {
				errorName = reason?.name;
			}
		}),
		{
			headers: {
				'content-type': 'application/octet-stream'
			}
		}
	);
}
