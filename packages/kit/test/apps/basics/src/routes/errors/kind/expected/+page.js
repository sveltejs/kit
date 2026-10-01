import { error } from '@sveltejs/kit';

export function load() {
	error(403, 'expected error');
}
