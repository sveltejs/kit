import { form } from '$app/server';
import * as v from 'valibot';

export const reset_id = form(
	v.object({
		message: v.pipe(v.string(), v.minLength(10, 'too short'))
	}),
	({ message }) => {
		return { success: true, message };
	}
);
