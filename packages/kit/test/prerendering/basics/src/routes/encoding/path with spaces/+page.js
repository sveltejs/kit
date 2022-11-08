/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const a = await fetch('/encoding/path with spaces.json');
	const b = await fetch('/encoding/path%20with%20encoded%20spaces.json');

	return {
		a: await a.json(),
		b: await b.json()
	};
}
