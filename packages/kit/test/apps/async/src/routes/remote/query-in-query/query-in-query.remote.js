import { command, query, requested } from '$app/server';
import { error } from '@sveltejs/kit';

/** @type {Array<[string, { id: string; title: string }]>} **/
const INITIAL_ITEMS = [
	['1', { id: '1', title: 'Buy groceries' }],
	['2', { id: '2', title: 'Walk the dog' }]
];

let items = new Map(INITIAL_ITEMS);

export const get_item = query('unchecked', (/** @type {string} */ id) => {
	if (id === 'error') return error(404, { message: 'Not found' });
	return items.get(id);
});

export const get_items = query(() => {
	return {
		total: items.size,
		rows: Array.from(items.values(), (item) => ({
			key: item.id,
			query: get_item(item.id).set(item)
		}))
	};
});

export const set_item_title = command('unchecked', ({ id, title }) => {
	const item = { id, title };
	items.set(id, item);
	get_item(id).set(item);
	return item;
});

export const set_item_title_server_refresh = command('unchecked', ({ id, title }) => {
	const item = { id, title };
	items.set(id, item);
	get_item(id).refresh();
	return item;
});

export const reset_items = command(() => {
	items = new Map(INITIAL_ITEMS);
	for (const [id, item] of items) {
		get_item(id).set({ ...item });
	}
});

export const append_to_all_titles_requested = command(
	'unchecked',
	async (/** @type {string} */ suffix) => {
		for (const [id, item] of items) {
			items.set(id, { ...item, title: item.title + suffix });
		}

		for (const { query } of requested(get_item, Infinity)) {
			void query.refresh();
		}
	}
);
