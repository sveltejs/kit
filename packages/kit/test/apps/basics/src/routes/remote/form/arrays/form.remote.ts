import { form } from '$app/server';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		strings: v.array(v.string()),
		numbers: v.array(v.number()),
		objects: v.array(
			v.object({
				name: v.string(),
				age: v.number()
			})
		)
	}),
	(input) => {
		return { success: true, data: input };
	}
);
