/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: 'edge' };

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { name: params.name };
}
