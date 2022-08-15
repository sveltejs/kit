import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ locals }) {
	return json({
		key: locals.key,
		params: locals.params
	});
}
