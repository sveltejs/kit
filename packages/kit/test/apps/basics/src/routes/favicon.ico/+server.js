export function GET() {
	return new Response(
		JSON.stringify({
			surprise: 'lol'
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
