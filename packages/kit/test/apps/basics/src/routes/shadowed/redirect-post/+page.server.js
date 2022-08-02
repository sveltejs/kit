import { redirect } from '@sveltejs/kit';

export function POST() {
	throw redirect(302, '/shadowed/redirected');
}
