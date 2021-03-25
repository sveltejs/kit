import * as api from '$lib/api.js';

export async function del({ params, context }) {
	if (!context.user) {
		return { status: 401 };
	}

	const { slug, id } = params;
	const { status, error } = await api.del(`articles/${slug}/comments/${id}`, context.user.token);

	if (error) {
		return { status, body: { error } };
	}
}
