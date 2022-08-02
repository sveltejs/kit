import { error } from '@sveltejs/kit';
import { api } from './api';
import type { GET, POST, PATCH, DELETE } from './$types';
import type { Todo } from './types';

/** @type {import('./$types').GET<Todo[]>} */
export const GET: GET<Todo[]> = async ({ locals }) => {
	// locals.userid comes from src/hooks.js
	const response = await api('GET', `todos/${locals.userid}`);

	if (response.status === 404) {
		// user hasn't created a todo list.
		// start with an empty array
		return {
			todos: []
		};
	}

	if (response.status === 200) {
		return {
			todos: await response.json()
		};
	}

	throw error(response.status);
};

/** @type {import('./$types').POST} */
export const POST: POST = async ({ request, locals }) => {
	const form = await request.formData();

	await api('POST', `todos/${locals.userid}`, {
		text: form.get('text')
	});
};

/** @type {import('./$types').PATCH} */
export const PATCH: PATCH = async ({ request, locals }) => {
	const form = await request.formData();

	await api('PATCH', `todos/${locals.userid}/${form.get('uid')}`, {
		text: form.has('text') ? form.get('text') : undefined,
		done: form.has('done') ? !!form.get('done') : undefined
	});
};

/** @type {import('./$types').DELETE} */
export const DELETE: DELETE = async ({ request, locals }) => {
	const form = await request.formData();

	await api('DELETE', `todos/${locals.userid}/${form.get('uid')}`);
};
