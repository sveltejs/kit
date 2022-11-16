/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const message = await fetch('/routing/prefetching/prefetched.json').then((r) => r.json());
	return { message };
}
