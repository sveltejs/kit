/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('refresh:now');
	return {
		now: Date.now()
	};
}
