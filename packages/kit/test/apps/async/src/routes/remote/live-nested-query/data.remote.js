import { query } from '$app/server';

export const get_secret = query(() => 'nested-secret');

export const live_outer = query.live(async function* () {
	// this nested query must not be implicitly registered and serialized
	// into the page payload — only the (transformed) yielded value should appear
	const secret = await get_secret();

	yield secret.toUpperCase();
});
