export async function GET() {
	return new Response(
		JSON.stringify({
			fruit: '🍎🍇🍌'
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
