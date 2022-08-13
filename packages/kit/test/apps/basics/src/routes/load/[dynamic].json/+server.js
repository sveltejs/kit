import { json } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ params }) {
	return json({
		name: params.dynamic
	});
}
