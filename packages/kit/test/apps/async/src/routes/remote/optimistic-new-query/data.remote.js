import { command, query, requested } from '$app/server';

export const foo = query(() => {
	return 'foo';
});

export const mutate = command(() => {
	for (const { query } of requested(foo, 1)) {
		query.set('baz');
	}
});
