/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		headers: new Headers({
			'X-Foo': 'bar'
		})
	};
}
