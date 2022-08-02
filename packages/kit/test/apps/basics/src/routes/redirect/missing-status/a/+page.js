import { redirect } from '@sveltejs/kit';

export function load() {
	throw redirect(undefined, './b');
}
