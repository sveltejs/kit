import { form } from '$app/server';
import * as v from 'valibot';

export const reset_id = form(
	v.object({
		message: v.string()
	}),
	({ message }) => {
		return { success: true, message };
	}
);
