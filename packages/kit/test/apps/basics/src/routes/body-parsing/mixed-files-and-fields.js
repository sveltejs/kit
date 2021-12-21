/** @type {import('@sveltejs/kit').RequestHandler<any, import('@sveltejs/kit/types/helper').ReadOnlyFormData>} */
export function post({ body }) {
	const file1 = body.file('file1');
	const field1 = body.get('field1');
	const multifield = body.getAll('multifield[]');

	return {
		body: {
			file1: {
				filename: file1?.filename ?? null,
				content: file1.data.toString()
			},
			field1,
			multifield
		}
	};
}
