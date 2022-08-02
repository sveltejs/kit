import { redirect } from '@sveltejs/kit/data';

export function POST({ setHeaders }) {
	setHeaders({ 'set-cookie': 'shadow-redirect=happy' });
	throw redirect(302, '/shadowed/redirected');
}
