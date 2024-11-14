import { error } from '@sveltejs/kit';

export function GET() {
	error(401, 'You shall not pass');
}
