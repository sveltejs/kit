/** @type {import('./$types').PageServerLoad} */
export async function load({ params, parent }) {
	const { y } = await parent();
	return {
		y: `${y} edited`,
		z: params.z
	};
}
