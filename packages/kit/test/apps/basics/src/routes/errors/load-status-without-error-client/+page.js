import { error } from '@sveltejs/kit';

export async function load() {
	if (typeof window !== 'undefined') {
		throw error(401, undefined);
	}
	return {};
}
