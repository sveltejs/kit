import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export async function load() {
	if (typeof window !== 'undefined') {
		throw error(555, new Error('Not found'));
	}

	return {};
}
