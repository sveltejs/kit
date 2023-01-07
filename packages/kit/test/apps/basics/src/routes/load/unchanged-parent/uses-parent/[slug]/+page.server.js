/** @type {import('./$types').PageServerLoad} */
export async function load({ params, parent }) {
	const { count } = await parent();

	return {
		doubled: count * 2,
		slug: params.slug
	};
}
