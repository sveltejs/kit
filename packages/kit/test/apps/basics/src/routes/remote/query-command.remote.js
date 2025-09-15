import { command, query } from '$app/server';

export const echo = query('unchecked', (value) => value);
export const add = query('unchecked', ({ a, b }) => a + b);

let count = 0;
const deferreds = [];

let get_count_called = false;
export const get_count = query(() => {
	get_count_called = true;
	return count;
});

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

export const set_count_server_refresh = command('unchecked', (c) => {
	count = c;
	get_count().refresh();
	return c;
});

export const set_count_server_set = command('unchecked', async (c) => {
	get_count_called = false;
	count = c;
	get_count().set(c);
	await new Promise((resolve) => setTimeout(resolve, 100));
	if (get_count_called) {
		throw new Error('get_count should not have been called');
	}
	return c;
});
