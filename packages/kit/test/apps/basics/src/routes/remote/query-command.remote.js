import { command, query } from '$app/server';

export const echo = query('unchecked', (value) => value);
export const add = query('unchecked', ({ a, b }) => a + b);

let count = 0;
const deferreds = [];

export const get_count = query(() => count);

export const set_count = command('unchecked', async ({ c, slow = false, deferred = false }) => {
	if (deferred) {
		const deferred = Promise.withResolvers();
		deferreds.push(deferred);
		await deferred.promise;
	} else if (slow) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	return (count = c);
});

export const resolve_deferreds = command(() => {
	for (const deferred of deferreds) {
		deferred.resolve();
	}
	deferreds.length = 0;
});

export const set_count_server = command('unchecked', async (c) => {
	count = c;
	await get_count().refresh();
	return c;
});
