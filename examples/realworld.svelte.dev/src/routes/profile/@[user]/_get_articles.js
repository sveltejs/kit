import * as api from '$common/api.js';
import { page_size } from '$common/constants.js';

export async function get_articles(request, context, type) {
	const p = +request.query.get('page') || 1;

	const q = new URLSearchParams([
		['limit', page_size],
		['offset', (p - 1) * page_size],
		[type, encodeURIComponent(request.params.user)]
	]);

	const { articles, articlesCount } = await api.get(
		`articles?${q}`,
		context.user && context.user.token
	);

	return {
		body: {
			articles,
			pages: Math.ceil(articlesCount / page_size)
		}
	};
}
