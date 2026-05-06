import { form } from '$app/server';
import * as v from 'valibot';

export const test = form(
	v.object({
		value: v.pipe(v.string(), v.minLength(3))
	}),
	async (data) => {
		return data;
	}
);
