import { query } from '$app/server';

export const get_post = query(async () => ({ title: 'Hello' }));

export const get_batched_post = query.batch('unchecked', async () => () => ({ title: 'Hello' }));

export const get_live_post = query.live(async function* () {
	yield { title: 'Hello' };
});
