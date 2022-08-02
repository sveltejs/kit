export function GET() {
	return new Response(
		JSON.stringify({
			type: 'layout'
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
