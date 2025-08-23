import { query } from '$app/server';
import { error } from '@sveltejs/kit';

export const get_todo = query.batch('unchecked', (ids) => {
	if (JSON.stringify(ids) !== JSON.stringify(['1', '2', 'error'])) {
		throw new Error(`Expected 3 IDs (deduplicated), got ${JSON.stringify(ids)}`);
	}

	return (id) =>
		id === '1'
			? { id: '1', title: 'Buy groceries' }
			: id === '2'
				? { id: '2', title: 'Walk the dog' }
				: error(404, { message: 'Not found' });
});
