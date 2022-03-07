import { v4 as uuid } from '@lukeed/uuid';
import type { RequestHandler } from '@sveltejs/kit';

type Database = {
	todo: {
		[uid: string]: Todo[];
	};
};

// --------------------------------------------------
// In actual use cases,
// this is where an actual API calls or database accesses or something else.
// Since this is a sample app, we will access in-memory objects instead.
// --------------------------------------------------
const database: Database = { todo: {} };

export const get: RequestHandler = async ({ locals }) => {
	// locals.userid comes from src/hooks.js
	const todos = database.todo[locals.userid] || [];
	return { body: { todos } };
};

export const post: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { text, done } = getFormValues(form);
	const { todo } = database;
	if (!todo[locals.userid]) todo[locals.userid] = [];
	todo[locals.userid].push({
		uid: uuid(),
		created_at: new Date(),
		text,
		done: done || false
	});
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
	const { todo } = database;
	const index = todo[locals.userid].findIndex((t) => t.uid === uid);
	const existsTodo = todo[locals.userid][index];
	if (!existsTodo) return { status: 404 };
	todo[locals.userid][index] = {
		uid,
		created_at: existsTodo.created_at,
		text: text || existsTodo.text,
		done: typeof done !== undefined ? done : existsTodo.done
	};
	return redirect;
};

export const del: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { uid } = getFormValues(form);
	const { todo } = database;
	todo[locals.userid] = todo[locals.userid].filter((t) => t.uid !== uid);
	return redirect;
};

function getFormValues(form: FormData): Partial<Todo> {
	return {
		uid: form.get('uid')?.toString(),
		text: form.get('text')?.toString(),
		done: form.get('done')?.toString() === 'true'
	};
}
