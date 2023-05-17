/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/invalidation/server-fetch/count.json');
	return res.json();
}
