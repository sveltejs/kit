/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return {
		slug: params.slug
	};
}
