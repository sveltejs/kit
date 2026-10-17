/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	return { id: params.id };
}
