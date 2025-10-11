import { form } from '$app/server';
import * as v from 'valibot';

export const touched_form = form(
	v.object({
		name: v.optional(v.string()),
		age: v.optional(v.number())
	}),
	(data) => ({ submitted: data })
);
