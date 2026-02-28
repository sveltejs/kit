import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';

export const redirectForm = form(
	v.object({
		id: v.optional(v.string())
	}),
	() => {
		redirect(307, '/remote/form/redirect-target/destination');
	}
);
