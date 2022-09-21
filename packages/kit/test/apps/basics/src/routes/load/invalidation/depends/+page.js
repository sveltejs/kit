/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('app://invalidate/load');
	return {
		load: new Date().toString(),
		...data
	};
}
