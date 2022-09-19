import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function POST({ request }) {
	const origin = request.headers.get('origin');
	return json({ origin });
}
