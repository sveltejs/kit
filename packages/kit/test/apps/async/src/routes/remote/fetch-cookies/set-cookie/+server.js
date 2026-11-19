import { text } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ cookies, fetch, url }) {
	if (url.searchParams.has('relay')) {
		return fetch('/remote/fetch-cookies/set-cookie');
	}

	cookies.set('injected', 'a b', { path: '/', httpOnly: false, secure: false });
	cookies.delete('deleted', { path: '/' });
	return text('set', { headers: { 'set-cookie': 'raw=1; Path=/' } });
}
