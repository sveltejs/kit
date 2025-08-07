export const prerender = true;

export function GET() {
	return new Response('This is plain text content', {
		headers: {
			'content-type': 'text/plain'
		}
	});
}
