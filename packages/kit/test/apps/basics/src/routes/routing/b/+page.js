/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const letter = await fetch('/routing/b.json').then((r) => (r.ok ? r.json() : ''));
	return { letter };
}
