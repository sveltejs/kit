/** @type {import('./$types').RequestHandler} */
export function GET() {
	return new Response('GET');
}

/** @type {import('./$types').RequestHandler} */
export function PUT() {
	return new Response('PUT');
}

/** @type {import('./$types').RequestHandler} */
export function PATCH() {
	return new Response('PATCH');
}

/** @type {import('./$types').RequestHandler} */
export function POST() {
	return new Response('POST');
}

/** @type {import('./$types').RequestHandler} */
export function DELETE() {
	return new Response('DELETE');
}
