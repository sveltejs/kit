/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: 'edge' };
export const prerender = true;

export function GET() {
	return new Response('prerendered');
}
