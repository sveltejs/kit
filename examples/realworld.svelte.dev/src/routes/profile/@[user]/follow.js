import * as api from '$common/api.js';

export async function post(request, context) {
	return {
		body: await api.post(`profiles/${request.params.user}/follow`, null, context.user.token)
	};
}

export async function del(request, context) {
	return {
		body: await api.del(`profiles/${request.params.user}/follow`, context.user.token)
	};
}
