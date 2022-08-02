import { error } from '@sveltejs/kit/data';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	throw error(555, 'Not found');
}
