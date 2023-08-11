/** @type {import('./$types').PageLoad} */
export async function load({ fetch, data, url }) {
	const { a } = data;

	const res = await fetch(new URL('/load/serialization/fetched-from-shared.json', url.origin));
	const { b } = await res.json();

	return { a, b, c: a + b };
}
