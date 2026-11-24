import { form } from '$app/server';
import * as v from 'valibot';

export const survey = form(
	v.object({
		name: v.pipe(v.string(), v.minLength(3, 'too short')),
		flags: v.optional(v.array(v.optional(v.boolean(), false))),
		answers: v.optional(v.array(v.optional(v.string())))
	}),
	(data) => JSON.stringify(data)
);
