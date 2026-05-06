import { form, query } from '$app/server';

let count = 0;

export const get_count = query(() => {
	return count;
});
export const increment_count = query(() => {
	count++;
	return count;
});

export const set = form(async () => {
	await increment_count().refresh();
	await get_count().refresh();
});
