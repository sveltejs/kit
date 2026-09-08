/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: 'nodejs24.x' };

export function GET() {
	return new Response('slug');
}
