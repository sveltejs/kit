import { query } from '$app/server';
import { error } from '@sveltejs/kit';

/** @type {ReadonlyMap<string, { id: string; title: string }>} */
const TODOS = new Map([
	['1', { id: '1', title: 'Buy groceries' }],
	['2', { id: '2', title: 'Walk the dog' }]
]);

export const get_todo = query.batch('unchecked', (ids) => {
	if (new Set(ids).size !== ids.length) {
		throw new Error(`batch queries must be deduplicated, but got ${JSON.stringify(ids)}`);
	}

	return (id) => {
		if (id === 'error') return error(404, { message: 'Not found' });

		return TODOS.get(id);
	};
});
