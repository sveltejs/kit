/** @type {import('./$types').PageLoad} */
export async function load({ fetch, data }) {
	const { a } = data;

	const res = await fetch('/load/serialization/fetched-from-shared.json');
	const { b } = await res.json();

	return { a, b, c: a + b };
}
