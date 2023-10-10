// TODO 2.0: Delete
/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/path-base/server-fetch-invalidate/count.json');
	return res.json();
}
