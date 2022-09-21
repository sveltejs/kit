/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('app://invalidate/serverLoad');
	return {
		serverLoad: new Date().toString()
	};
}
