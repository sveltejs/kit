import { error } from '@sveltejs/kit';

export function GET() {
	throw error(401, 'You shall not pass');
}
