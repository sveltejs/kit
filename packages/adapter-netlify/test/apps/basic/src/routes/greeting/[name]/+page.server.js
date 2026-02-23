/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { name: params.name };
}
