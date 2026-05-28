import { query } from '$app/server';
import { error } from '@sveltejs/kit';

/** @type {ReadonlyMap<string, { id: string; title: string }>} */
const ITEMS = new Map([
	['1', { id: '1', title: 'Buy groceries' }],
	['2', { id: '2', title: 'Walk the dog' }]
]);

export const get_item = query('unchecked', (/** @type {string} */ id) => {
	if (id === 'error') return error(404, { message: 'Not found' });
	return ITEMS.get(id);
});

export const get_items = query(() => ({
	total: ITEMS.size,
	rows: Array.from(ITEMS.values(), (item) => ({
		key: item.id,
		query: get_item(item.id).set(item)
	}))
}));
