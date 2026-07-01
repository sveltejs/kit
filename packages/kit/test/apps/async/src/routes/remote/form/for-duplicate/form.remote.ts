import { form, query } from '$app/server';
import * as v from 'valibot';

let count = 0;

export const get_count = query(() => count);

export const increment = form(v.object({}), async () => {
	count++;
	await get_count().refresh();
});
