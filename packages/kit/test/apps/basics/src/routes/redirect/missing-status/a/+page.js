import { redirect } from '@sveltejs/kit/data';

export function load() {
	throw redirect(undefined, './b');
}
