import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export function load() {
	redirect(307, 'redirected?embedded=' + encodeURIComponent('/苗条?foo=bar&fizz=buzz'));
}
