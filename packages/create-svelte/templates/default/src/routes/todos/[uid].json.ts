import { api } from './_api';
import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';

// PATCH /todos/:uid.json
export const patch: RequestHandler<Locals> = async (event) => {
	const data = await event.request.formData();

	return api(event, `todos/${event.locals.userid}/${event.params.uid}`, {
		text: data.get('text'),
		done: data.has('done') ? !!data.get('done') : undefined
	});
};

// DELETE /todos/:uid.json
export const del: RequestHandler<Locals> = async (event) => {
	return api(event, `todos/${event.locals.userid}/${event.params.uid}`);
};
