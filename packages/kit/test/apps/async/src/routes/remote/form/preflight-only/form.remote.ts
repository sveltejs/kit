import { form, query } from '$app/server';
import * as v from 'valibot';

let data = { a: '', b: '', c: '' };

export const get = query(() => {
	return data;
});

export const set = form(
	v.object({
		a: v.pipe(v.string(), v.minLength(3, 'a is too short')),
		b: v.pipe(v.string(), v.minLength(3, 'b is too short')),
		c: v.pipe(v.string(), v.minLength(3, 'c is too short'))
	}),
	async (d) => {
		data = d;
	}
);
