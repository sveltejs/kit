/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/endpoint/implicit.json');
	return await res.json();
}
