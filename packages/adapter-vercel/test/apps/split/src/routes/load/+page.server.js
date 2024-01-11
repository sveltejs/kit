import page_server_text from '$lib/+page.server.js.txt';

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	return { ...(await parent()), page_server_text };
}
