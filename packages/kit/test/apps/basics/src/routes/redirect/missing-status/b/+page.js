import { redirect } from '@sveltejs/kit';

export function load() {
	// @ts-ignore
	throw redirect(555, './a');
}
