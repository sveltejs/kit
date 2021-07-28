/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export function get() {
	return {
		headers: { Location: '/top/rss' },
		status: 301
	};
}
