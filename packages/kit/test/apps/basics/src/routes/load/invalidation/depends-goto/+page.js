/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('invalidate-depends-goto:shared');
	return {
		shared: new Date().getTime(),
		...data
	};
}
