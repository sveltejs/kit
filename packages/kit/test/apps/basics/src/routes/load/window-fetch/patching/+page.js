import { browser } from '$app/environment';

/** @type {import('./$types').PageLoad} */
export async function load({ url, fetch }) {
	// simulate fetch being monkey-patched by a 3rd party library
	// run everything only in browser to avoid SSR caching
	if (browser) {
		const original_fetch = window.fetch;
		window.fetch = (input, init) => {
			console.log('Called a patched window.fetch');
			return original_fetch(input, init);
		};

		const res = await fetch(`${url.origin}/load/window-fetch/data.json`);
		const { answer } = await res.json();
		window.fetch = original_fetch;
		return { answer };
	}
	return {};
}
