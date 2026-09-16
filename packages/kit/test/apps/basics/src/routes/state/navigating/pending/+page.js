import { browser } from '$app/env';

/** @type {import('./$types').PageLoad} */
export async function load() {
	if (browser) {
		// stays in flight until the test releases it
		await new Promise((f) => {
			window.fulfil_navigation = f;
		});
	}
}
