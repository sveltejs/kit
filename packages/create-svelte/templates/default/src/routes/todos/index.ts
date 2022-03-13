import { v4 as uuid } from '@lukeed/uuid';
import type { RequestHandler, RequestHandlerOutput } from '@sveltejs/kit';
import todoManager from '$lib/todo/memory';
// Use this if you want to use the actual API server.
// import todoManager from '$lib/todo/api';

export const get: RequestHandler = async ({ locals }) => {
	try {
		// locals.userid comes from src/hooks.js
		const todos = await todoManager.get(locals.userid);
		return { body: { todos } };
	} catch (error_or_status) {
		return handle_error_or_status(error_or_status);
	}
};

export const post: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { text, done } = get_form_values(form);
	if (!text) return { status: 400, body: { error: 'Text required' } };

	const todo: Todo = {
		uid: uuid(),
		created_at: new Date(),
		text,
		done: done ?? false
	};
	try {
		await todoManager.post(locals.userid, todo);
	} catch (error_or_status) {
		return handle_error_or_status(error_or_status);
	}
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
	const { uid, text, done } = get_form_values(form);
	try {
		await todoManager.patch(locals.userid, uid, { text, done });
	} catch (error_or_status) {
		return handle_error_or_status(error_or_status);
	}
	return redirect;
};

export const del: RequestHandler = async ({ request, locals }) => {
	const form = await request.formData();
	const { uid } = get_form_values(form);
	try {
		await todoManager.delete(locals.userid, uid);
	} catch (error_or_status) {
		return handle_error_or_status(error_or_status);
	}
	return redirect;
};

const get_form_values = (form: FormData): Partial<Todo> => {
	return {
		uid: form.get('uid')?.toString(),
		text: form.get('text')?.toString(),
		done: form.get('done')?.toString() === 'true'
	};
};

const handle_error_or_status = (error_or_status: unknown): RequestHandlerOutput<{}> => {
	if (is_number(error_or_status)) return { status: error_or_status };
	return {
		status: 500,
		body: { error: error_or_status }
	};
};

const is_number = (test: unknown): test is number => {
	return Number.isFinite(test);
};
