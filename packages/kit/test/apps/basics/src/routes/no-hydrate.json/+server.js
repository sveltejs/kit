export function GET() {
	return new Response(
		JSON.stringify({
			type: 'no-hydrate'
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
