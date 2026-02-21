import { form } from '$app/server';
import * as v from 'valibot';

export const editData = form(
	v.object({
		name: v.optional(v.string()),
		description: v.optional(v.string())
	}),
	async (data) => {
		return data;
	}
);
