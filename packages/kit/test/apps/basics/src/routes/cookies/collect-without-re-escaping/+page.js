import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load}*/
export async function load({ fetch }) {
	if (!browser) {
		// We don't want the client-side collected cookie to clobber the
		// server-side collected cookie that we're actually testing.
		await fetch('/cookies/collect-without-re-escaping/set-cookie');
	}
}
