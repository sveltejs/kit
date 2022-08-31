import { redirect } from '@sveltejs/kit';

export function actions({ setHeaders }) {
	setHeaders({ 'set-cookie': 'shadow-redirect=happy' });
	throw redirect(302, '/shadowed/redirected');
}
