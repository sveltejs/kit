/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { optional: params.optional ?? null };
}
