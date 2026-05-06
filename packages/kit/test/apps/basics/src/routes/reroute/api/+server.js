import { text } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ cookies }) {
	return text(cookies.get('reroute-cookie') ? '/reroute/async/b' : '/reroute/async/a');
}
