/** @type {import('@sveltejs/kit').RequestHandler<any, import('@sveltejs/kit/types/helper').ReadOnlyFormData>} */
export function post({ body }) {
	const files = body.files('files[]');

	return {
		body: {
			filenames: files ? files.map((file) => file?.filename) : []
		}
	};
}
