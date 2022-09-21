/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('app://invalidate/load');
	return {
		loadTimestamp: new Date().toString(),
		load: data.serverLoad,
		...data
	};
}
