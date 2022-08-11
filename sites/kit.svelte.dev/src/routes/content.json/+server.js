import { content } from '$lib/search/content.server.js';

export function GET() {
	return new Response(
		JSON.stringify({
			blocks: content()
		}),
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			}
		}
	);
}
