export function GET() {
	return new Response('ok');
}

export function fallback() {
	return new Response('catch-all');
}
