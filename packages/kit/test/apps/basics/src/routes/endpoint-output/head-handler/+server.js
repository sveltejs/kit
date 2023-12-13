/** @type {import('@sveltejs/kit').RequestHandler} */
export function HEAD() {
	return new Response('', {
		headers: {
			'x-sveltekit-head-endpoint': 'true'
		}
	});
}
