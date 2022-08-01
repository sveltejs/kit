export function GET() {
	return new Response(JSON.stringify({ answer: 42 }));
}
