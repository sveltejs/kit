/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	await new Promise((res) => setTimeout(res, params.slug === 'b' ? 10 : 300));
	return {
		scores: params.slug === 'a' ? '1 - 1' : '2 - 2'
	};
}
