import { content } from '$lib/search/content.server.js';
import { json } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('./$types').RequestHandler} */
export function GET() {
	return json({
		blocks: content()
	});
}
