import { json } from '@sveltejs/kit';

let aborted = false;

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	return json({ aborted });
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	request.signal.addEventListener('abort', () => (aborted = true));
	await new Promise((r) => setTimeout(r, 1000));
	return json({ ok: true });
}
