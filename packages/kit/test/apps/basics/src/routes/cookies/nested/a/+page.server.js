import { COOKIE_NAME } from '../../shared';

/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	const data = {};
	event.cookies.set(COOKIE_NAME, 'teapot', { path: '/cookies/nested/a' });
	const value = event.cookies.get(COOKIE_NAME);
	if (value) {
		data.cookie = value;
	}
	return data;
}
