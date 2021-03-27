import * as api from '$lib/api';
import { page_size } from '$lib/constants';

export async function get({ query, context }) {
	const tab = request.query.get('tab') || 'all';
	const tag = request.query.get('tag');
	const page = +request.query.get('page') || 1;

	const endpoint = tab === 'feed' ? 'articles/feed' : 'articles';

	const q = new URLSearchParams();

	q.set('limit', page_size);
	q.set('offset', (page - 1) * page_size);

	if (tag) {
		q.set('tag', tag);
	}

	const { articles, articlesCount } = await api.get(
		`${endpoint}?${q}`,
		context.user && context.user.token
	);

	return {
		body: {
			articles,
			pages: Math.ceil(articlesCount / page_size)
		}
	};
}
