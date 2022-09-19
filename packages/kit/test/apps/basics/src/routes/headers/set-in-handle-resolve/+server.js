/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ setHeaders }) {
	setHeaders({
		'x-endpoint': 'SvelteKit'
	});

	return new Response('endpoint', {
		status: 200
	});
}
