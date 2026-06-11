import { command, query, requested } from '$app/server';
import * as v from 'valibot';

const counts = new Map<string, number>();

export const get_count = query(v.string(), (key) => counts.get(key) ?? 0);

export const bump = command(v.string(), (key) => {
	counts.set(key, (counts.get(key) ?? 0) + 1);

	// limit 0: every requested refresh is over the limit and must be
	// rejected with an error record that reaches the client
	requested(get_count, 0);
});
