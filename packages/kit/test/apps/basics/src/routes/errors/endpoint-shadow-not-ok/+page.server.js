import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	throw error(555, undefined);
}
