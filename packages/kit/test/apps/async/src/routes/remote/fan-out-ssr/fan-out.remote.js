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

export const get_items = query.fanOut(get_item, () => {
	/** @type {Array<[string, { id: string; title: string }]>} */
	const rows = Array.from(ITEMS.values()).map((item) => [item.id, item]);
	return { rows, total: ITEMS.size };
});
