// The GET handler is included alongside the HEAD handler to test that HEAD
// is not included twice in the `allow` header list of allowed methods.
// This is because HEAD is always allowed if GET is allowed too
export function GET() {
	return new Response('Hello world!');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export function HEAD() {
	return new Response('', {
		headers: {
			'x-sveltekit-head-endpoint': 'true'
		}
	});
}
