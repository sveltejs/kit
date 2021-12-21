/** @type {import('@sveltejs/kit').RequestHandler<any, import('@sveltejs/kit/types/helper').ReadOnlyFormData>} */
export function post({ body }) {
	const foo = body.get('foo');
	const bar = body.get('bar');
	const baz = body.getAll('baz[]');

	return {
		body: {
			foo,
			bar,
			baz
		}
	};
}
