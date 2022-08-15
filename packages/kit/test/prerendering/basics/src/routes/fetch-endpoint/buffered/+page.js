/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const url = '/fetch-endpoint/buffered.json';
	const res = await fetch(url);

	return await res.json();
}
