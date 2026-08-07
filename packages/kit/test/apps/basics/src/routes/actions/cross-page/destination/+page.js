/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	if (url.searchParams.has('throw-in-load')) {
		throw new Error('universal load should not run for an action error');
	}
}
