/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const url = '/fetch-endpoint/not-buffered.json';
	const res = await fetch(url);

	return {
		headers: res.headers
	};
}
