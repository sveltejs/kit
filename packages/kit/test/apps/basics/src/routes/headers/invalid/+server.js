export function GET({ setHeaders }) {
	globalThis.__SVELTEKIT_DEV__ = true;

	setHeaders({
		'cache-control': 'totally-invalid',
		'content-type': 'not-a-real-type'
	});

	return new Response('Testing invalid headers');
}
