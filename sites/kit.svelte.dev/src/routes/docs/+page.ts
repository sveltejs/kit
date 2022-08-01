import { redirect } from '@sveltejs/kit/data';

/** @type {import('./$types').Load} */
export function load() {
	throw redirect(307, '/docs/introduction');
}
