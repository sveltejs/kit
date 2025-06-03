import { command, query } from '$app/server';

export const echo = query((value) => value);
export const add = query((a, b) => a + b);

let count = 0;

export const get_count = query(() => count);

export const set_count = command((c) => (count = c));

export const set_count_server = command(async (c) => {
	count = c;
	await get_count().refresh();
	return c;
});
