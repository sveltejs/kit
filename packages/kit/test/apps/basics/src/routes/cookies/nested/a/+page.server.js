import { COOKIE_NAME } from '../../shared';

/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	event.cookies.set(COOKIE_NAME, 'teapot', {
		path: ''
	});

	return {
		cookie: event.cookies.get(COOKIE_NAME)
	};
}
