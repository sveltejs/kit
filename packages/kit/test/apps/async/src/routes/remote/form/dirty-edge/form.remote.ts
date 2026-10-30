import { form } from '$app/server';
import * as v from 'valibot';

export const edge_state = form(
	v.object({
		checkbox: v.optional(v.boolean(), false),
		file: v.optional(v.file()),
		object: v.object({ leaf: v.string(), sibling: v.string() }),
		lifecycle: v.string()
	}),
	async (data) => ({ success: true, data })
);
