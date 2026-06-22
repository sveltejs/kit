import { createHash } from 'node:crypto';

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
	const hash = createHash('sha256');
	const reader = request.body?.getReader();

	if (!reader) {
		return new Response('no body', { status: 400 });
	}

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		hash.update(value);
		await new Promise((r) => setTimeout(r, 10));
	}

	return new Response(hash.digest('base64url'));
}
