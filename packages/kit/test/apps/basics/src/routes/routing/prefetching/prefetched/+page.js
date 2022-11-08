/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const message = await fetch('/routing/prefetched.json').then((r) => r.json());
	return { message };
}
