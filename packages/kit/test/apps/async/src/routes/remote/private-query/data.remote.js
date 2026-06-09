import { command, query } from '$app/server';

// deliberately not exported — this must never be serialized into any response
const get_secret = query(() => 'private-data');

export const reveal = command(async () => {
	const secret = await get_secret();

	return secret.toUpperCase();
});
