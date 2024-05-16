import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(307, encodeURI('苗条'));
}
