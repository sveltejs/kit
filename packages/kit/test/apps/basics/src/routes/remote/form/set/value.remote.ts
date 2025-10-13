import { form } from '$app/server';
import * as v from 'valibot';

export const values = form(
	v.object({
		leaf: v.string()
	}),
	async (data) => {
		return { success: true, data };
	}
);
