let count = 0;

/** @type {import('./$types').PageServerLoad} */
export function load({ depends }) {
	depends('app://invalidate/server_count');
	return {
		server_timestamp: new Date().toString(),
		server_count: ++count
	};
}
