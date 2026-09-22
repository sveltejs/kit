export const prerender = true;

export function GET() {
	return new Response(new Uint8Array([0, 0, 1, 0]), {
		headers: { 'content-type': 'image/x-icon' }
	});
}
