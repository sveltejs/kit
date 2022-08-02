import { redirect } from '@sveltejs/kit/data';

/** @type {import('@sveltejs/kit').Load} */
export function load() {
	throw redirect(307, 'redirected?embedded=' + encodeURIComponent('/苗条?foo=bar&fizz=buzz'));
}
