/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const resp = await fetch('/load/cache-control/force/count', { cache: 'no-cache' });
	return resp.json();
}
