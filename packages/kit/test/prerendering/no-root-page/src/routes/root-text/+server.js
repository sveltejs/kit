export const prerender = true;

export function GET() {
	return new Response('Root-text endpoint returning plain text', {
		headers: {
			'content-type': 'text/plain'
		}
	});
}