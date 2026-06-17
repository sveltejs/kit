import { form, query } from '$app/server';
import * as v from 'valibot';

const counts = new Map<string, number>();

export const get_count = query(v.string(), (key) => {
	return counts.get(key) ?? 0;
});

// deliberately refreshes nothing — the client's `.updates()` call alone
// should suppress `invalidateAll`
export const increment = form(v.object({ key: v.string() }), ({ key }) => {
	counts.set(key, (counts.get(key) ?? 0) + 1);
	return 'done';
});
