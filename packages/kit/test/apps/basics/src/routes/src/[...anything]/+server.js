/** @type {import('./$types').RequestHandler} */
export function GET() {
	return new Response('dynamically rendered file');
}
