/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, fetch }) {
	const href = `http://localhost:${url.searchParams.get('port')}/server-fetch-request.json`;

	const res = await fetch(href);
	const { answer } = await res.json();
	return { answer };
}
