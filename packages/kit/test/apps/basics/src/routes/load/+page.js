import { browser } from '$app/env';

/** @type {import('@sveltejs/kit').Load} */
export function load(pageContext) {
	if (browser) {
		window.pageContext = pageContext;
	}
	return { foo: 'bar' };
}
