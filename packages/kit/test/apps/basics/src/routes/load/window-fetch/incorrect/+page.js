/** @type {import('./$types').PageLoad} */
export async function load({ url }) {
	const res = await fetch(`${url.origin}/load/window-fetch/data.json`);
	const { answer } = await res.json();
	return { answer };
}
