import { error, form } from '$app/server';
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

		// Test error() after validation passes
		if (data.foo === 'b' && data.bar === 'e') {
			error(401, 'Unauthorized');
		}

		console.log(data);
	}
);
