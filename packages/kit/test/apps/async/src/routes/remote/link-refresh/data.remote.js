import { command, query } from '$app/server';

let count = 0;

export const reset = command(() => {
	count = 0;
	get_count().refresh();
});

export const increment = command(() => {
	count += 1;
	// don't refresh!
});

export const get_count = query(() => count);
