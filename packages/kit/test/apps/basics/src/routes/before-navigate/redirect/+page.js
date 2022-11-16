import { redirect } from '@sveltejs/kit';

export function load() {
	throw redirect(307, '/before-navigate/prevent-navigation');
}
