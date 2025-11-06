import { form } from '$app/server';
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

export const issue_path_form = form(
	v.object({
		nested: v.object({
			value: v.pipe(v.string(), v.minLength(3))
		})
	}),
	async (data) => {
		return data;
	}
);
