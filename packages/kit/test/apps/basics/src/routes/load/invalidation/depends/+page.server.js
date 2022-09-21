let callCount = 0;

/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('app://invalidate/serverLoad');
	return {
		serverLoadTimestamp: new Date().toString(),
		serverLoad: ++callCount
	};
}
