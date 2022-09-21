/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('invalidate-depends:shared');
	return {
		shared: new Date().getTime(),
		...data
	};
}
