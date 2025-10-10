import { form } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e', 'f']),
		button: v.optional(v.literal('submitter'))
	}),
	async (data, invalid) => {
		// Test imperative validation
		if (data.foo === 'c') {
			invalid(invalid.foo('Imperative: foo cannot be c'));
		}

		console.log(data);
	}
);

export const my_form_2 = form(
	v.object({
		baz: v.picklist(['a', 'b'])
	}),
	async ({ baz }) => {
		if (baz === 'a') error(400, 'Nope');
	}
);
