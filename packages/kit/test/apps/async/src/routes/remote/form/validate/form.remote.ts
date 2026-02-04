import { form } from '$app/server';
import { error, invalid } from '@sveltejs/kit';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e', 'f']),
		button: v.literal('submitter')
	}),
	async (data, issue) => {
		// Test imperative validation
		if (data.foo === 'c') {
			invalid(issue.foo('Imperative: foo cannot be c'));
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
