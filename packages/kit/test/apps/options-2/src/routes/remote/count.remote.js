import { building, dev } from '$app/environment';
import { command, form, prerender, query } from '$app/server';

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

export const set_count_form = form(async (form_data) => {
	const c = /** @type {string} */ (form_data.get('count'));
	return (count = parseInt(c));
});
