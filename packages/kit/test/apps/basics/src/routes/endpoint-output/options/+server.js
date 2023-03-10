/** @type {import('@sveltejs/kit').RequestHandler} */
export function OPTIONS() {
	return new Response('ok');
}
