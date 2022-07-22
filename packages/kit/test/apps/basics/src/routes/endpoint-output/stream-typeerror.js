let errorName = null;

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ url }) {
	if (url.searchParams.has('what')) {
		const body = errorName;
		errorName = null;
		return { body };
	}

	return {
		headers: {
			'content-type': 'application/octet-stream'
		},
		body: new ReadableStream({
			pull(controller) {
				controller.enqueue(42);
			},

			cancel(reason) {
				errorName = reason?.name;
			}
		})
	};
}
