import { query } from '$app/server';

const ids = ['1', '2', '3'];

export const get_items = query(() => {
	for (const id of ids) {
		get_item(id).set(`seeded-${id}`);
	}
	return ids;
});

export const get_item = query('unchecked', (id) => `fetched-${id}`);
