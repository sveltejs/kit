/** @type {import('./$types').PageLoad} */
export async function load({ fetch, data, url }) {
	const { a } = data;

	const res = await fetch(new URL('/load/serialization/fetched-from-shared.json', url.origin));
	const { b } = await res.json();

	// check that this doesn't mutate the original object
	// and make the server data unserializable
	data.sum = () => a + b;

	return { a, b, c: data.sum() };
}
