import { command, query } from '$app/server';

export const echo = query('unchecked', (value) => value);
export const add = query('unchecked', ({ a, b }) => a + b);

let count = 0;

export const get_count = query(() => count);

export const set_count = command('unchecked', async ({ c, slow = false }) => {
	if (slow) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	return (count = c);
});

export const set_count_server = command('unchecked', async (c) => {
	count = c;
	await get_count().refresh();
	return c;
});
