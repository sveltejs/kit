/** @type {import('./$types').LayoutLoad} */
export async function load({ fetch }) {
	const res = await fetch('./data.json');
	return await res.json();
}
