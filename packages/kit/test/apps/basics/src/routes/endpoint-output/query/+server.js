import { text } from '@sveltejs/kit';

export function GET() {
	return text('get');
}

/** @type {import('./$types').RequestHandler} */
export async function QUERY({ request }) {
	return text(`query: ${await request.text()}`);
}
