import { form } from '$app/server';
import { error, fail, redirect } from '@sveltejs/kit';

export const task_one = form(async (form_data) => {
	const task = /** @type {string} */ (form_data.get('task'));
	if (task === 'error') {
		error(500, { message: 'Expected error' });
	}
	if (task === 'fail') {
		return fail(400, 'failed');
	}
	if (task === 'redirect') {
		redirect(303, '/remote');
	}
	return task;
});

export const task_two = form((form_data) => {
	const task = /** @type {string} */ (form_data.get('task'));
	if (task === 'error') {
		throw new Error('Unexpected error');
	}
	if (task === 'fail') {
		return fail(400, 'failed');
	}
	return task;
});
