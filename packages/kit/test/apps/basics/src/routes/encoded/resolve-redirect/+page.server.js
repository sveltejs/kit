import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(303, resolve('/encoded/[slug]?q=a%20b', { slug: 'møte' }));
}
