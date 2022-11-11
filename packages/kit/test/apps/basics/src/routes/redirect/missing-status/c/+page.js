import { redirect } from '@sveltejs/kit';

export function load() {
	throw redirect(309, './a');
}
