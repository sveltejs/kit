import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function DELETE(event) {
	return json({
		id: event.params.id
	});
}
