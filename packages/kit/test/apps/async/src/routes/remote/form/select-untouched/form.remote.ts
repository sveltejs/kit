import { form } from '$app/server';
import * as v from 'valibot';

export const myform = form(
	v.object({
		message: v.string(),
		number: v.picklist(['one', 'two', 'three'])
	}),
	(_data) => {}
);
