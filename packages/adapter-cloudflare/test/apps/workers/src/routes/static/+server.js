export const prerender = true;

export function GET() {
	return new Response('prerendered response');
}
