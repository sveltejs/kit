/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('isomorphic-load');
	return { from_server: data };
}
