export const prerender = true;

export function GET() {
	return new Response(JSON.stringify({ hello: 'world' }), {
		headers: { 'content-type': 'application/json' }
	});
}
