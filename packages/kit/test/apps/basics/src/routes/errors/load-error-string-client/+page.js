import { error } from '@sveltejs/kit';

export async function load() {
	if (typeof window !== 'undefined') {
		throw error(555, 'Not found');
	}

	return {};
}
