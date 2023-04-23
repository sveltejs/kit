/** @type {import('@sveltejs/kit').RequestHandler} */
export function OPTIONS() {
	return new Response('ok');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export function CUSTOM() {
	return new Response('ok');
}
