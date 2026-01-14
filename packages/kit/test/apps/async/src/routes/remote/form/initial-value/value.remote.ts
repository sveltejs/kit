import { form } from '$app/server';
import * as v from 'valibot';

export const values = form(
	v.object({
		val: v.string()
	}),
	async (data) => {
		return { success: true, data };
	}
);
