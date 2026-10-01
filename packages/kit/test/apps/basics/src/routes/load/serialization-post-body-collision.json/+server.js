/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return new Response('GET');
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	return new Response(`POST:${await request.text()}`);
}
