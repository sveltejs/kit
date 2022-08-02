import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/errors/endpoint-not-ok.json');
	if (res.ok) {
		return await res.json();
	} else {
		throw error(res.status, new Error(res.statusText));
	}
}
