import { command, query, requested } from '$app/server';

export const get = query(() => {
	return 'get';
});

export const add = command('unchecked', async () => {
	await requested(get, 1).refreshAll();
	return 'post';
});
