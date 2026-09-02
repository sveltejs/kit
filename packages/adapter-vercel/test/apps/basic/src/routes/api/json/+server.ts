import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const config = {
	isr: {
		expiration: 60
	}
};

export function GET() {
	return json({ ok: true });
}

export const fallback: RequestHandler = async ({ request }) => {
	return json({ method: request.method, body: await request.text() });
};
