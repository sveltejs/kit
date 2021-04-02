import * as api from '$lib/api.js';

export async function post({ params, context }) {
	return {
		body: await api.post(`profiles/${params.user}/follow`, null, context.user.token)
	};
}

export async function del({ params, context }) {
	return {
		body: await api.del(`profiles/${params.user}/follow`, context.user.token)
	};
}
