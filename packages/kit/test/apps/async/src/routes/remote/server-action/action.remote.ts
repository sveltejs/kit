import * as v from 'valibot';
import { command } from '$app/server';

export const do_something = command(v.string(), (input) => {
	return `action: ${input}`;
});
