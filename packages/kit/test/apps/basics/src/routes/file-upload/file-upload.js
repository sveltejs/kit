/** @type {import('@sveltejs/kit').RequestHandler<any, import('@sveltejs/kit/types/helper').ReadOnlyFormData>} */
export function post({ body }) {
	const favicon = body.file('favicon');

	return {
		body: {
			filename: favicon?.filename ?? null
		}
	};
}
