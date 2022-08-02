import { redirect } from '@sveltejs/kit';

export function GET({ setHeaders }) {
	setHeaders({ 'set-cookie': 'shadow-redirect=happy' });
	throw redirect(302, '/shadowed/redirected');
}
