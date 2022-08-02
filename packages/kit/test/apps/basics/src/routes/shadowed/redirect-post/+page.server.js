import { redirect } from '@sveltejs/kit/data';

export function POST() {
	throw redirect(302, '/shadowed/redirected');
}
