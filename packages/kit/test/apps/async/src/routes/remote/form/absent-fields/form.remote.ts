import { form } from '$app/server';
import * as v from 'valibot';

// none of these fields is optional and none has a default
export const plain = form(
	v.object({
		name: v.string(),
		subscribe: v.boolean(),
		langs: v.array(v.string()),
		colors: v.array(v.string()),
		flags: v.array(v.boolean()),
		nested: v.object({ notify: v.boolean() }),
		extra: v.optional(v.boolean())
	}),
	(data) => data
);

export const consent = form(
	v.object({
		agree: v.literal(true, 'You must agree'),
		legal: v.object({ terms: v.literal(true, 'Accept the terms') })
	}),
	() => 'accepted'
);

export const keyed = form(v.object({ id: v.string(), done: v.boolean() }), (data) => data);

export const locked = form(v.object({ on: v.boolean() }), (data) => data);
