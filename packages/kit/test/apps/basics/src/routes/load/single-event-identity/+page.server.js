/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const res = await fetch('/load/single-event-identity/echo');
	return await res.json();
}
