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
	(id: number) => {
		console.log('get_todo prerendered', id);
		return id;
	},
	{ entries: () => [[1]] as Array<[number]> } // TODO can we beat TS into infering that this is an array of tuples?
);

export const add_todo = command(async (text: string) => {
	const asd = getRequestEvent();
	_todos.push({ text, done: false, id: Math.random() });
	// invalidate(get_todos.key);
});

export const add_todo_form = form(async (form) => {
	const text = form.get('text');
	_todos.push({ text, done: false, id: Math.random() });
	return 'returned something from ddaathe a';
});
