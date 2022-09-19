import { COOKIE_NAME } from '../../shared';

/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		cookie: event.cookies.get(COOKIE_NAME)
	};
}
