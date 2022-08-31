import { json } from '@sveltejs/kit';

// no export const prerender here, it should be prerendered by virtue
// of being fetched from a prerendered page

/** @type {import('./$types').RequestHandler} */
export function GET() {
	return json({ answer: 42 });
}
