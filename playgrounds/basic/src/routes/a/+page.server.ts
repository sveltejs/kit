import { redirect } from '@sveltejs/kit';

console.log(import.meta.url);

export function load() {
	redirect(307, '/b');
}
