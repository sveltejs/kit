/** @type {import('@sveltejs/kit').RequestHandler<any, import('@sveltejs/kit/types/helper').ReadOnlyFormData>} */
export function post({ body }) {
	const file1 = body.file('file1');

	return {
		body: {
			filename: file1?.filename ?? null,
			content: file1.data.toString()
		}
	};
}
