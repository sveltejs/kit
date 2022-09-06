import type { Handle } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	if (!event.cookies.get('userid')) {
		// if this is the first time the user has visited this app,
		// set a cookie so that we recognise them when they return
		event.cookies.set('userid', crypto.randomUUID(), {
			path: '/'
		});
	}

	event.locals.userid = event.cookies.get('userid');

	return resolve(event);
};
