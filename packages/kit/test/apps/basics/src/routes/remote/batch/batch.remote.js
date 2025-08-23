import { query } from '$app/server';

const mock_data = [
	{ id: '1', title: 'Buy groceries' },
	{ id: '2', title: 'Walk the dog' },
	{ id: '3', title: 'Write code' },
	{ id: '4', title: 'Read book' }
];

export const get_todo = query.batch('unchecked', (ids) => {
	if (ids.length !== 2) {
		throw new Error(`Expected 2 IDs (deduplicated), got ${JSON.stringify(ids)}`);
	}

	const results = ids.map((id) => mock_data.find((todo) => todo.id === id));
	return (id) => results.find((todo) => todo?.id === id);
});
