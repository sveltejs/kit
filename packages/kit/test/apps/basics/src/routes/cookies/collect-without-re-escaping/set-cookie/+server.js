/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET() {
	return new Response(null, { headers: { 'set-cookie': 'cookie-special-characters="foo"' } });
}
