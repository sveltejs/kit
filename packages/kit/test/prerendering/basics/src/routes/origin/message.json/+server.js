export function GET() {
	return new Response(JSON.stringify({
		message: 'hello'
	}), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
