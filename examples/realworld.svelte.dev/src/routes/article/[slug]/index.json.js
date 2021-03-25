import * as api from '$lib/api.js';

export async function get({ params, context }) {
	const { slug } = params;
	const { article } = await api.get(`articles/${slug}`, context.user && context.user.token);

	return {
		body: article
	};
}

export async function put(request) {
	console.log('put', request);
}
