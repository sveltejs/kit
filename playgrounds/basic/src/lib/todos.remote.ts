import { invalidate } from '$app/navigation';
import { query, action, formAction, getRequestEvent } from '$app/server';

let _todos: any[] = [];

export const get_todos = query(() => {
	return _todos;
});

export const add_todo = action(async (text: string) => {
	const asd = getRequestEvent();
	_todos.push({ text, done: false, id: Math.random() });
	invalidate(get_todos.key);
});

export const add_todo_form = formAction(async (form) => {
	const text = form.get('text');
	_todos.push({ text, done: false, id: Math.random() });
});
