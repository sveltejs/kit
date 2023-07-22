import { content } from './content.server.js';
import { json } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return json({
		blocks: await content()
	});
}
