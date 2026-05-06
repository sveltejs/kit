import { form, query } from '$app/server';
import * as v from 'valibot';

let result = true;

export const get_result = query(() => result);

export const submit = form(
	v.object({
		checkbox_field: v.boolean()
	}),
	async (data) => {
		result = data.checkbox_field;
		get_result().refresh();
	}
);
