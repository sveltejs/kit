/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ cookies }) {
	cookies.set('endpoint', 'SvelteKit');

	return new Response('endpoint', {
		status: 200
	});
}
