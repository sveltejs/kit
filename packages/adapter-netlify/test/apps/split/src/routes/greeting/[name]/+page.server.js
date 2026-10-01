/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { nodeVersion: 'nodejs24.x' };

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
	return { name: params.name };
}
