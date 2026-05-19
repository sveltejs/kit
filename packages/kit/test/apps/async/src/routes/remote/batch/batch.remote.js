import { command, query, requested } from '$app/server';
import { error } from '@sveltejs/kit';

/** @type {Array<[string, { id: string; title: string }]>} **/
const INITIAL_TODOS = [
	['1', { id: '1', title: 'Buy groceries' }],
	['2', { id: '2', title: 'Walk the dog' }]
];

let todos = new Map(INITIAL_TODOS);

export const get_todo = query.batch('unchecked', (ids) => {
	if (new Set(ids).size !== ids.length) {
		throw new Error(`batch queries must be deduplicated, but got ${JSON.stringify(ids)}`);
	}

	return (id) => {
		if (id === 'error') return error(404, { message: 'Not found' });

		return todos.get(id);
	};
});

export const set_todo_title = command('unchecked', ({ id, title }) => {
	const todo = { id, title };
	todos.set(id, todo);
	get_todo(id).set(todo);
	return todo;
});

export const set_todo_title_server_refresh = command('unchecked', ({ id, title }) => {
	const todo = { id, title };
	todos.set(id, todo);
	get_todo(id).refresh();
	return todo;
});

export const reset_todos = command(() => {
	todos = new Map(INITIAL_TODOS);
	for (const [id, todo] of todos) {
		get_todo(id).set({ ...todo });
	}
});

export const append_to_all_titles_requested = command(
	'unchecked',
	async (/** @type {string} */ suffix) => {
		for (const [id, todo] of todos) {
			todos.set(id, { ...todo, title: todo.title + suffix });
		}

		for (const { query } of requested(get_todo, Infinity)) {
			void query.refresh();
		}
	}
);
