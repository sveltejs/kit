import { form } from '$app/server';
import * as v from 'valibot';

export const my_form = form(
	v.object({
		submitter: v.string()
	}),
	async (data) => {
		return data.submitter;
	}
);
