/** @type {import('./$types').PageServerLoad} */
export function load({ isDataRequest }) {
	return {
		request: isDataRequest
	};
}
