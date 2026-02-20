import { command, query } from '$app/server';

export const foo = query(() => {
	return 'foo';
});

export const mutate = command(() => {
	foo().set('baz');
});
