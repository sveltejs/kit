import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

/** @type {import('./$types').Load} */
export function load() {
	throw redirect(307, `${base}/docs/introduction`);
}
