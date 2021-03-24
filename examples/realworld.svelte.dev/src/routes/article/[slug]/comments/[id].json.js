import * as api from '$lib/api.js';

export async function del(request, context) {
	if (!context.user) {
		return { status: 401 };
	}

	const { slug, id } = request.params;
	const { status, error } = await api.del(`articles/${slug}/comments/${id}`, context.user.token);

	if (error) {
		return { status, body: { error } };
	}
}
