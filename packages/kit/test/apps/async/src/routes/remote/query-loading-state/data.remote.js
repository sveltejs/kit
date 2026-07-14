import { query } from '$app/server';

export const get_slow_data = query(async () => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return 'slow data';
});
