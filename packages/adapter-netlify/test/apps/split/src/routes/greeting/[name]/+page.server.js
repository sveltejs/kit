/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: 'nodejs24.x' };

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { name: params.name };
}
