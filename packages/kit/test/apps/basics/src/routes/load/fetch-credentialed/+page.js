/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/fetch-credentialed.json');

	/** @type {any} */
	const { name } = await res.json();

	return {
		name
	};
}
