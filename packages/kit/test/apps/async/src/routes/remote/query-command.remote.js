import { command, query, requested } from '$app/server';

export const echo = query('unchecked', (value) => value);
export const add = query('unchecked', ({ a, b }) => a + b);

let count = 0;
/**
 * @type {PromiseWithResolvers<any>[]}
 */
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
	count = c;

	for (const arg of requested(get_count)) {
		await get_count(arg).refresh();
	}

	return count;
});

export const set_count_refresh_all = command('unchecked', async (c) => {
	count = c;
	await requested(get_count).refreshAll();
	return c;
});

let should_fail_flaky = false;

export const get_flaky_count = query('unchecked', (key) => {
	if (key === 'fail' && should_fail_flaky) {
		should_fail_flaky = false;
		throw new Error('flaky refresh failed');
	}

	return `${key}:${count}`;
});

export const set_count_partial_refresh = command('unchecked', async (c) => {
	count = c;
	should_fail_flaky = true;

	for (const key of requested(get_flaky_count)) {
		await get_flaky_count(key).refresh();
	}

	return c;
});

export const set_count_partial_refresh_all = command('unchecked', async (c) => {
	count = c;
	should_fail_flaky = true;
	await requested(get_flaky_count).refreshAll();
	return c;
});

export const resolve_deferreds = command(() => {
	for (const deferred of deferreds) {
		deferred.resolve(null);
	}
	deferreds.length = 0;
});

export const set_count_server_refresh = command('unchecked', (c) => {
	count = c;
	get_count().refresh();
	return c;
});

export const set_count_server_refresh_after_read = command('unchecked', async (c) => {
	await get_count();
	count = c;
	await get_count().refresh();
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
