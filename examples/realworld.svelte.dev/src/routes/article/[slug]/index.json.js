import * as api from '$common/api.js';

export async function get(request, context) {
	const { slug } = request.params;
	const { article } = await api.get(`articles/${slug}`, context.user && context.user.token);

	return {
		body: article
	};
}

export async function put(request, context) {
	console.log('put', request);
}
