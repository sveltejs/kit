import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export function load() {
	redirect(301, '/env');
}
