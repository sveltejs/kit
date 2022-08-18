import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function OPTIONS() {
	return json({});
}
