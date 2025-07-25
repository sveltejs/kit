import { form, query } from '$app/server';
import { error, redirect } from '@sveltejs/kit';

let task;

export const get_task = query(() => {
	return task;
});

export const task_one = form(async (form_data) => {
	task = /** @type {string} */ (form_data.get('task'));

	if (task === 'error') {
		error(500, { message: 'Expected error' });
	}
	if (task === 'redirect') {
		redirect(303, '/remote');
	}
	if (task === 'override') {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return task;
});

export const task_two = form(async (form_data) => {
	task = /** @type {string} */ (form_data.get('task'));

	if (task === 'error') {
		throw new Error('Unexpected error');
	}
	if (task === 'override') {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return task;
});
