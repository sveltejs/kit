import { error } from '@sveltejs/kit/data';

export function GET() {
	throw error(404, undefined);
}
