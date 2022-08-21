import { content } from '$lib/search/content.server.js';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET() {
	return json({
		blocks: content()
	});
}
