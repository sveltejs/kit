import { createHash } from 'node:crypto';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function PUT({ request }) {
	const hash = createHash('sha256');
	const reader = request.body.getReader();

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		hash.update(value);
		await new Promise((r) => setTimeout(r, 10));
	}

	return new Response(hash.digest('base64url'));
}
