import { browser } from '$app/env';
import { redirect } from '@sveltejs/kit';

export async function load() {
	if (browser) {
		redirect(302, '/reroute/client-only-redirect/a');
	}

	return {};
}
