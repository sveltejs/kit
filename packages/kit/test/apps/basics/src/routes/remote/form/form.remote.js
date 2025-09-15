import { form, query } from '$app/server';
import { error, redirect } from '@sveltejs/kit';

let task;
const deferreds = [];

export const get_task = query(() => {
	return task;
});

export const resolve_deferreds = form(async () => {
	for (const deferred of deferreds) {
		deferred.resolve();
	}
	deferreds.length = 0;
	return 'resolved';
});

export const task_one = form(async (form_data) => {
	task = /** @type {string} */ (form_data.get('task'));

	if (task === 'error') {
		error(400, { message: 'Expected error' });
	}
	if (task === 'redirect') {
		redirect(303, '/remote');
	}
	if (task === 'deferred') {
		const deferred = Promise.withResolvers();
		deferreds.push(deferred);
		await deferred.promise;
	} else if (task === 'override') {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return task;
});

export const task_two = form(async (form_data) => {
	task = /** @type {string} */ (form_data.get('task'));

	if (task === 'error') {
		throw new Error('Unexpected error');
	}
	if (task === 'deferred') {
		const deferred = Promise.withResolvers();
		deferreds.push(deferred);
		await deferred.promise;
	} else if (task === 'override') {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return task;
});
