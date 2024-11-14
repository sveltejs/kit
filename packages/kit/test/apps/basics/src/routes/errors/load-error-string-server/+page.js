import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	error(555, 'Not found');
}
