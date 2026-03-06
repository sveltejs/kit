import { command, query } from '$app/server';

let count = 0;

export const get_count = query(() => {
	return count;
});

export const increment = command(() => {
	count += 1;
	get_count().refresh();
});
