/** @type {import('./$types').PageLoad} */
export function load({ depends }) {
	depends('refresh:now');
	return {
		now: Date.now()
	};
}
