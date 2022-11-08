import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	if (browser) {
		throw new Error('Crashing now');
	}

	return {};
}
