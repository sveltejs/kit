import { query } from '$app/server';

export const greet = query(() => {
	return 'hello';
});
