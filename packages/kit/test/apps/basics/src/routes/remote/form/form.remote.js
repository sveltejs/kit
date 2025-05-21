import { form } from '$app/server';

export const add_one = form((form_data) => {
	const n = parseInt(form_data.get('n'), 10);
	return n + 1;
});

export const add_two = form((form_data) => {
	const n = parseInt(form_data.get('n'), 10);
	return n + 2;
});
