import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';

export async function load() {
	if (browser) {
		throw redirect(303, '/redirect-on-load/redirected');
	}

	return {};
}
