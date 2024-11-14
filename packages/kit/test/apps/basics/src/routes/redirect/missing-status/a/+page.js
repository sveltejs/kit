import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(undefined, './b');
}
