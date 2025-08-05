/** @type {import('./$types').LayoutLoad} */
export function load({ depends }) {
	depends('invalidate-depends-goto:layout');
	return {
		layout: new Date().getTime()
	};
}
