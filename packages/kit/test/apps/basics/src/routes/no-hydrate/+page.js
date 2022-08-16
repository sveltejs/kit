export const hydrate = false;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/no-hydrate.json');

	/** @type {any} */
	const { type } = await res.json();

	return { type };
}
