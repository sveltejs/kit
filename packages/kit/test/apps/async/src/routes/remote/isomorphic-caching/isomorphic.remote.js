import { query, command } from '$app/server';

let counter = 0;
let times_called = 0;

export const get_value = query(() => {
	times_called += 1;
	return counter;
});

export const get_call_count = query(() => times_called);

export const reset = command(() => {
	counter = 0;
	times_called = 0;
});
