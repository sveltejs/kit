import { query } from '$app/server';

export const get_a = query(() => 1);

export const get_b = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 10));
	return 2;
});
