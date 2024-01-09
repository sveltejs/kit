import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export function load() {
	redirect(307, '/encoding/redirected%20path%20with%20encoded%20spaces');
}
