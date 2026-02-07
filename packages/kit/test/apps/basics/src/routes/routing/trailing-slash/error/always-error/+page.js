import { error } from '@sveltejs/kit';

export const trailingSlash = 'always';

export function load() {
	error(500, 'trailing slash error test');
}
