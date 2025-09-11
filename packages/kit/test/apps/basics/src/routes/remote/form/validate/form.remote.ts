import { form } from '$app/server';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e', 'f'])
	}),
	async (data) => {
		console.log(data);
	}
);
