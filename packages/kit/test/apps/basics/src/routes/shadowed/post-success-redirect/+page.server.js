import { redirect } from '@sveltejs/kit';

export function actions() {
	throw redirect(303, '/shadowed/post-success-redirect/redirected');
}
