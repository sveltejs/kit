import { redirect } from '@sveltejs/kit';

export const trailingSlash = 'never';

export function load() {
	redirect(307, '../c');
}
