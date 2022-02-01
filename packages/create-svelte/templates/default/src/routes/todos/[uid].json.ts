import { api } from './_api';
import type { RequestHandler } from '@sveltejs/kit';

// PATCH /todos/:uid.json
export const patch: RequestHandler = async (event) => {
	const data = await event.request.formData();

	return api(event, `todos/${event.locals.userid}/${event.params.uid}`, {
		text: data.get('text'),
		done: data.has('done') ? !!data.get('done') : undefined
	});
};

// DELETE /todos/:uid.json
export const del: RequestHandler = async (event) => {
	return api(event, `todos/${event.locals.userid}/${event.params.uid}`);
};
