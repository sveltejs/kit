/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const resp = await fetch('/load/cache-control/bust/count');
	return resp.json();
}
