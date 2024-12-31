/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('invalidate-depends-goto:server');
	return {
		server: new Date().getTime()
	};
}
