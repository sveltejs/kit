import { redirect } from '@sveltejs/kit';

export function GET() {
	throw redirect(302, '/shadowed/redirect/c');
}
