import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export function load() {
	redirect(301, resolve('/dynamic/foo'));
}
