/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const message = await fetch('/routing/preloading/preloaded.json').then((r) => r.json());
	return { message };
}
