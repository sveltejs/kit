import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET() {
	return json({
		answer: 42
	});
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	return json({
		question: await request.text()
	});
}
