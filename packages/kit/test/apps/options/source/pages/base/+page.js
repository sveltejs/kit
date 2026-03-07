import { base, assets } from '$app/paths';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	return {
		paths: {
			base,
			assets
		}
	};
}
