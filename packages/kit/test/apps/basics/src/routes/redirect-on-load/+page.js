import { redirect } from '@sveltejs/kit/data';
import { browser } from '$app/env';

export async function load() {
	if (browser) {
		throw redirect(303, '/redirect-on-load/redirected');
	}

	return {};
}
