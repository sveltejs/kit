import { redirect } from '@sveltejs/kit';

export const prerender = true;

export const ssr = false;

/** @type {import('@sveltejs/kit').Load} */
export function load() {
	redirect(301, 'https://example.com/redirected');
}
