import { command, query } from '$app/server';

export const get = query(() => {
	return 'get';
});

export const add = command('unchecked', () => {
	return 'post';
});
