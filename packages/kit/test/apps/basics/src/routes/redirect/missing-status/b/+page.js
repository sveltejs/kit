import { redirect } from '@sveltejs/kit';

export function load() {
	// @ts-ignore
	redirect(555, './a');
}
