/** @type {import("@sveltejs/kit").RequestHandler} */
export function GET({ setHeaders }) {
	setHeaders({
		'cache-control': 'totally-invalid',
		'content-type': 'not-a-real-type'
	});

	return new Response('Testing invalid headers');
}
