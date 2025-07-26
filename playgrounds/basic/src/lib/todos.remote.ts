import { query, prerender, command, form, getRequestEvent } from '$app/server';

let _todos: any[] = [];

export const get_todos = query(() => {
	console.log('get_todos');
	return _todos;
});

export const get_todos_prerendered = prerender(() => {
	console.log('get_todos prerendered');
	return _todos;
});

export const get_todo_prerendered = prerender(
	'unchecked',
	(id: number) => {
		console.log('get_todo prerendered', id);
		return id;
	},
	{ inputs: () => [1] }
);

export const add_todo = command('unchecked', async (text: string) => {
	const event = getRequestEvent();
	console.log('got event', event.isRemoteRequest);
	_todos.push({ text, done: false, id: Math.random() });
});

export const add_todo_form = form(async (form) => {
	const text = form.get('text');
	_todos.push({ text, done: false, id: Math.random() });
	return 'returned something from server';
});
