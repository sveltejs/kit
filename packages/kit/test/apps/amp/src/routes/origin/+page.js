/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, fetch }) {
	const res = await fetch('/origin.json');
	const data = await res.json();

	return {
		origin: url.origin,
		data
	};
}
