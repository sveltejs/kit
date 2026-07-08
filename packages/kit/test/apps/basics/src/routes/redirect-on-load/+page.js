import { redirect } from '@sveltejs/kit';
import { browser } from '$app/env';

export async function load() {
	if (browser) {
		redirect(303, '/redirect-on-load/redirected');
	}

	return {};
}
