import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function load() {
	error(555, undefined);
}
