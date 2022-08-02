/** @type {import('@sveltejs/kit').Load}*/
export async function load({ fetch }) {
	const res = await fetch('/answer.json');
	const { answer } = await res.json();
	return { answer };
}
