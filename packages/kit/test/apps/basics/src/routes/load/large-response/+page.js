/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/large-response/text.txt');
	const text = await res.text();

	return {
		text
	};
}
