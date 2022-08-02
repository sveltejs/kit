export function GET() {
	return new Response(
		JSON.stringify({
			works: true
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
