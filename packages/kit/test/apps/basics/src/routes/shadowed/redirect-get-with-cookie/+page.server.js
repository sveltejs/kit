import { redirect } from '@sveltejs/kit';

export function load({ setHeaders }) {
	setHeaders({ 'set-cookie': 'shadow-redirect=happy' });
	throw redirect(302, '/shadowed/redirected');
}
