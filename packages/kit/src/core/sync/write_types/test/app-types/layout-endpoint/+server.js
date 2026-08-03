export function GET() {
	return new Response('a request to this endpoint does not execute the sibling layout');
}
