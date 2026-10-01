import { form } from '$app/server';
import * as v from 'valibot';

export const dirty_state = form(
	v.object({
		amount: v.string(),
		normalized: v.number(),
		enabled: v.optional(v.boolean(), false),
		object: v.object({ leaf: v.string(), sibling: v.string() })
	}),
	async (data) => ({ success: true, data })
);
