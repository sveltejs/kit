/** @type {import('./$types').RequestHandler} */
export function GET() {
	return new Response(
		JSON.stringify({
			answer: 42
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
