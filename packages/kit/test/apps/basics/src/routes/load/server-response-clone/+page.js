/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, fetch }) {
	const href = new URL(url);
	href.pathname = '';

	const res = await fetch(href);
	const clonedRes = res.clone();
	return { text: await clonedRes.text() };
}
