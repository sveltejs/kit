import { redirect } from '@sveltejs/kit';

export function actions() {
	throw redirect(302, '/shadowed/redirected');
}
