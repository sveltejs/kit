/** @type {import('./$types').PageLoad} */
export function load({ data, depends }) {
	depends('app://invalidate/shared_count');
	return {
		shared_timestamp: new Date().toString(),
		shared_count: data.server_count,
		...data
	};
}
