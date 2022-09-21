/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('invalidate-depends:server');
	return {
		server: new Date().getTime()
	};
}
