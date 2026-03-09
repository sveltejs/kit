import { error } from '@sveltejs/kit';

export const trailingSlash = 'always';

export function load() {
	error(500, 'deliberate error');
}
