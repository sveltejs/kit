/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request }) {
	if (request.headers.get('if-none-match') === '@1234@')
		return new Response(undefined, { status: 304 });

	return new Response(`${Math.random()}`, {
		headers: {
			etag: '@1234@'
		}
	});
}
