import { browser } from '$app/environment';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ server }) {
	return {
		correct: browser === !server && (!server || ((await server.request.arrayBuffer()) && true))
	};
}