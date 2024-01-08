import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function load() {
	if (browser) {
		redirect(302, '/client-only-redirect/a');
	}

	return {};
}
