import { form } from '$app/server';
import { error, fail } from '@sveltejs/kit';

export const task_one = form((form_data) => {
	const task = form_data.get('task');
	if (task === 'error') {
		error(500, { message: 'Expected error' });
	}
	if (task === 'fail') {
		return fail(400, 'failed');
	}
	return task;
});

export const task_two = form((form_data) => {
	const task = form_data.get('task');
	if (task === 'error') {
		throw new Error('Unexpected error');
	}
	if (task === 'fail') {
		return fail(400, 'failed');
	}
	return task;
});
