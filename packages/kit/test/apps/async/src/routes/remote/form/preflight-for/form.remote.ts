import { form, query } from '$app/server';
import * as v from 'valibot';

let value = 0;

export const get_value = query(() => {
	return value;
});

export const set_value = form(
	v.object({
		value: v.pipe(v.number(), v.maxValue(20, 'too big'))
	}),
	async (data) => {
		value = data.value;
		get_value().refresh();
	}
);
