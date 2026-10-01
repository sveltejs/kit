/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { edge: true };

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { optional: params.optional ?? null };
}
