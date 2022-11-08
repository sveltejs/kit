import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET(event) {
	return json({
		name: event.locals.name ?? 'Fail'
	});
}
