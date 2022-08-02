/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response(undefined, {
		headers: new Headers({
			'X-Foo': 'bar'
		})
	});
}
