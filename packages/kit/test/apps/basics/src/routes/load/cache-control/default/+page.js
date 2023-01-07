/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const resp = await fetch('/load/cache-control/default/count');
	return resp.json();
}
