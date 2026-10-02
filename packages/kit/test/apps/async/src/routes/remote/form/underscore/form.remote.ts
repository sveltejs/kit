import { form } from '$app/server';
import * as v from 'valibot';

export const register = form(
	v.object({
		username: v.pipe(v.string(), v.minLength(8)),
		_password: v.pipe(v.string(), v.minLength(8))
	}),
	async (data) => {}
);
