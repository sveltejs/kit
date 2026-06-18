import { form } from '$app/server';
import * as v from 'valibot';

export const test_form = form(
	v.object({
		foo: v.pipe(v.string(), v.minLength(2)),
		nested: v.object({
			bar: v.pipe(v.string(), v.maxLength(2))
		})
	}),
	async () => {}
);
