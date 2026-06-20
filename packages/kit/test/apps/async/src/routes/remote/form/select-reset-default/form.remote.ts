import { form } from '$app/server';
import * as v from 'valibot';

export const set_favourite = form(
	v.object({
		language: v.string()
	}),
	async (data) => {
		return { language: data.language };
	}
);
