import * as api from '$common/api.js';

export async function post({ body }) {
	const response = await api.post('users/login', {
		user: body
	});

	return {
		body: response
	};
}