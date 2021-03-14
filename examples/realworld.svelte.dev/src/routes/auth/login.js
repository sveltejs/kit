import * as api from '$lib/api.js';

export async function post({ body }) {
	const response = await api.post('users/login', {
		user: body
	});

	return {
		body: response
	};
}
