import { redirect } from '@sveltejs/kit';

export function load() {
	// @ts-ignore we want to test the behaviour of undefined
	redirect(undefined, './b');
}
