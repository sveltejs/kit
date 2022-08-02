import { error } from '@sveltejs/kit/data';

export function load() {
	throw error(500, 'Error');
}
