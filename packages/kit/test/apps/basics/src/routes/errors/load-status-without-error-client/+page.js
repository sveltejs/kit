import { error } from '@sveltejs/kit';

export async function load() {
	if (typeof window !== 'undefined') {
		error(401, undefined);
	}
	return {};
}
