import { query } from '$app/server';

export const get_delayed_data = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 2000));
	return 'delayed data';
});

export const get_fast_data = query(() => {
	return 'fast data';
});
