import { form, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';

export const reset_form = form(
	v.object({
		action: v.picklist(['return', 'redirect'])
	}),
	(data) => {
		const { url } = getRequestEvent();
		switch (data.action) {
			case 'return':
				return 'hello world';
			case 'redirect':
				url.search += 'foo';
				redirect(303, url.href);
		}
	}
);
