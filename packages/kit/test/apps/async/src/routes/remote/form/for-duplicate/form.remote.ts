import { form, query } from '$app/server';
import * as v from 'valibot';
import { per_session } from '../../per-session.js';

const session = per_session(() => ({ count: 0 }));

export const get_count = query(() => session().count);

export const increment = form(v.object({}), async () => {
	session().count++;
	await get_count().refresh();
});
