import { v4 as uuid } from '@lukeed/uuid';
import type { RequestHandler } from '@sveltejs/kit';
import { database } from '$lib/db';

export const get: RequestHandler = async ({ locals }) => {
	// locals.userid comes from src/hooks.js
	const todos = database.getTodos(locals.userid);
	return { body: { todos } };
};

export const post: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { text, done } = getFormValues(form);

	if (!text) return { status: 400, body: { error: 'Missing text' } };

	const todo: Todo = {
		uid: uuid(),
		created_at: new Date(),
		text,
		done: done ?? false
	};
	database.addTodo(locals.userid, todo);
	return {};
};

// If the user has JavaScript disabled, the URL will change to
// include the method override unless we redirect back to /todos
const redirect = {
	status: 303,
	headers: {
		location: '/todos'
	}
};

export const patch: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { uid, text, done } = getFormValues(form);

	try {
		database.updateTodo(locals.userid, uid, { text, done });
		return redirect;
	} catch (e) {
		return { status: 404, body: { error: 'Todo not found.' } };
	}
};

export const del: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { uid } = getFormValues(form);

	try {
		database.deleteTodo(locals.userid, uid);
		return redirect;
	} catch {
		return { status: 404, body: { error: 'Todo not found.' } };
	}
};

function getFormValues(form: FormData): Partial<Todo> {
	return {
		uid: form.get('uid')?.toString(),
		text: form.get('text')?.toString(),
		done: form.get('done')?.toString() === 'true'
	};
}
