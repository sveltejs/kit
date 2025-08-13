/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, fetch }) {
	const res = await fetch(new Request(url.origin + '/load/fetch-request.json'));
	const { answer } = await res.json();
	return { answer };
}
