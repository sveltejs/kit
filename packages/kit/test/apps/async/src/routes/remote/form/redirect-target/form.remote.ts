import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { object, optional, string } from 'valibot';

export const redirectForm = form(
	object({
		id: optional(string())
	}),
	() => {
		redirect(303, '/remote/form/redirect-target/destination');
	}
);
