import { form, query } from '$app/server';
import * as v from 'valibot';

let counts = new Map();

export const get_count = query(v.string(), (key) => {
	return counts.get(key) ?? 0;
});
export const increment_count = query(v.string(), (key) => {
	counts.set(key, (counts.get(key) ?? 0) + 1);
	return counts.get(key);
});

export const set = form(v.object({ key: v.string() }), async ({ key }) => {
	await increment_count(key).refresh();
	await get_count(key).refresh();
});
