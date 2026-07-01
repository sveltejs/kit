import { query } from '$app/server';

export const getData = query(() => {
	return { a: 1 };
});
