/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response(JSON.stringify({}), {
		headers: { 'content-type': 'application/json; charset=utf-8' }
	});
}
