import { redirect } from '@sveltejs/kit/data';

export function GET() {
	throw redirect(302, '/shadowed/redirect/c');
}
