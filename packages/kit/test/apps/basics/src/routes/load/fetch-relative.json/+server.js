export function GET() {
	return new Response(
		JSON.stringify({
			answer: 42
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	return new Response(
		JSON.stringify({
			question: await request.text()
		}),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	);
}
