/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ request }) {
	if (request.headers.get('if-none-match') === '@1234@') return { status: 304 };
	return {
		body: `${Math.random()}`,
		headers: {
			etag: '@1234@'
		}
	};
}
