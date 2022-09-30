import { browser } from '$app/environment';

let count = 0;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ params, setHeaders }) {
	if (browser) {
		count += 1;
	}

	// Using setHeader has no effect on the client; testing that here
	setHeaders({
		'cache-control': 'public, max-age=5'
	});
	return {
		x: params.x,
		loads: count
	};
}
