import { browser } from '$app/env';

let count = 0;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ params, setHeaders }) {
	if (browser) {
		count += 1;
	}

	setHeaders({
		'cache-control': 'max-age=5'
	});
	return {
		x: params.x,
		loads: count
	};
}
