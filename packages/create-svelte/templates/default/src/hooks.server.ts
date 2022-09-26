import type { Handle } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async ({ event, resolve }) => {
	let userid = event.cookies.get('userid');

	if (!userid) {
		// if this is the first time the user has visited this app,
		// set a cookie so that we recognise them when they return
		userid = crypto.randomUUID();
		event.cookies.set('userid', userid, { path: '/', secure: false });
	}

	event.locals.userid = userid;

	return resolve(event);
};
