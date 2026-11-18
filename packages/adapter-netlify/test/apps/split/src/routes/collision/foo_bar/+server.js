/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { split: true };

export function GET() {
	return new Response('underscore');
}
