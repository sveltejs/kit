import { error } from '@sveltejs/kit/data';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET() {
	throw error(555, undefined);
}
