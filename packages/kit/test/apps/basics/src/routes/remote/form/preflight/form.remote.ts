import { form, query } from '$app/server';
import * as v from 'valibot';

let number = 0;

export const get_number = query(() => {
	return number;
});

export const set_number = form(
	v.object({
		number: v.pipe(
			v.string(),
			v.regex(/^\d+$/),
			v.transform((n) => +n),
			v.minValue(10, 'too small')
		)
	}),
	async (data) => {
		number = data.number;
		get_number().refresh();
	}
);
