import { building, dev } from '$app/env';
import { command, form, getRequestEvent, prerender, query } from '$app/server';
import * as v from 'valibot';

// count is keyed by the `session` cookie from hooks.server.js so the
// parallel tests that read and set it can't see each other's mutations
/** @type {Map<string, number>} */
const counts = new Map();

const session_id = () => getRequestEvent().cookies.get('session') ?? 'default';

export const get_count = query(() => counts.get(session_id()) ?? 0);

export const set_count = command(
	'unchecked',
	/** @param {number} c */
	async (c) => {
		counts.set(session_id(), c);
		return c;
	}
);

export const prerendered = prerender(() => {
	if (!building && !dev) {
		throw new Error('this prerender should not be called at runtime in production');
	}

	return 'yes';
});

export const set_count_form = form(v.object({ count: v.string() }), async (data) => {
	const count = parseInt(data.count);
	counts.set(session_id(), count);
	get_count().set(count);
	return count;
});
