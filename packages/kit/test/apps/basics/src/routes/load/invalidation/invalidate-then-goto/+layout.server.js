/** @type {import('./$types').PageLoad} */
export function load({ depends }) {
	depends('invalidate-depends:goto');
	return {
		layoutDate: new Date().getTime()
	};
}
