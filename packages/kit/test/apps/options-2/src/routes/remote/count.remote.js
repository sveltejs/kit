import { building, dev } from '$app/environment';
import { command, form, prerender, query } from '$app/server';
import * as v from 'valibot';

let count = 0;

export const get_count = query(() => count);

export const set_count = command(
	'unchecked',
	/** @param {number} c */
	async (c) => {
		return (count = c);
	}
);

export const prerendered = prerender(() => {
	if (!building && !dev) {
		throw new Error('this prerender should not be called at runtime in production');
	}

	return 'yes';
});

export const set_count_form = form(v.object({ count: v.string() }), async (data) => {
	return (count = parseInt(data.count));
});
