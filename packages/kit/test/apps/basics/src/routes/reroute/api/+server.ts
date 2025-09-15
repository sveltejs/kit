import { text } from '@sveltejs/kit';

export function GET({ cookies }) {
	return text(cookies.get('reroute-cookie') ? '/reroute/async/b' : '/reroute/async/a');
}
