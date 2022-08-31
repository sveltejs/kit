/**
 * @type {import('./$types').PageLoad}
 */
export async function load({ fetch, depends }) {
	depends('cache:control');
	const resp = await fetch('./cache-control/count');
	return resp.json();
}
