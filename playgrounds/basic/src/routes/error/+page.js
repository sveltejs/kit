import { error, redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	error(555, 'wtf');
	redirect(307, '/d');
}
