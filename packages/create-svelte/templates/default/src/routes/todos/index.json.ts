import { api } from './_api';
import type { RequestHandler } from '@sveltejs/kit';

// GET /todos.json
export const get: RequestHandler = async (request) => {
	if (!request.context.userid) {
		// the user has never visited the site before
		// and so doesn't yet have a userid, which is
		// set in `handle`, in src/hooks.js
		return { body: [] };
	}

	const response = await api(request, `todos/${request.context.userid}`);

	if (response.status === 404) {
		// the user has visited before, but hasn't yet
		// created a todo list. start with an empty array
		return { body: [] };
	}

	return response;
};

// POST /todos.json
export const post: RequestHandler = async (request) => {
	const response = await api(request, `todos/${request.context.userid}`, {
		// because index.svelte posts a FormData object,
		// request.body is _also_ a (readonly) FormData
		// object, which allows us to get form data
		// with the `body.get(key)` method
		text: request.body.get('text')
	});

	return response;
};
