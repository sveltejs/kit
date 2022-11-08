import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	if (browser) {
		await new Promise((f) => {
			window.fulfil_navigation = f;
		});
	}

	return {};
}
