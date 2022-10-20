/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/serialization/fetched-from-server.json');
	const { a } = await res.json();
	return { a };
}
