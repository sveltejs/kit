/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return {
		headers: new Headers({
			'X-Foo': 'bar'
		})
	};
}
