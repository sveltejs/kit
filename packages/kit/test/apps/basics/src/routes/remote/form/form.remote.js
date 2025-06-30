import { form, query } from '$app/server';
import { error, fail, redirect } from '@sveltejs/kit';

let task;

export const get_task = query(() => {
	return task;
});

export const task_one = form(async (form_data) => {
	task = /** @type {string} */ (form_data.get('task'));

	if (task === 'error') {
		error(500, { message: 'Expected error' });
	}
	if (task === 'fail') {
		return fail(400, 'failed');
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
	if (task === 'fail') {
		return fail(400, 'failed');
	}
	if (task === 'override') {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return task;
});
