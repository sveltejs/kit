/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/fetch-headers.json');

	return {
		headers: await res.json()
	};
}
