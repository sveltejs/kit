/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		headers: {
			'Set-Cookie': 'foo=bar'
		}
	};
}
