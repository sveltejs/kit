export const prerender = true;

export function GET() {
	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'content-type': 'application/json' }
	});
}
