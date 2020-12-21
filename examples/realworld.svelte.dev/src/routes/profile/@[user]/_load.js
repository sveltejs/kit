import * as api from '$common/api.js';

const page_size = 10;

export function create_load(type) {
	return async ({ page }) => {
		const p = +page.query.get('p') || 1;

		const q = new URLSearchParams([
			['limit', page_size],
			['offset', (p - 1) * page_size],
			[type, encodeURIComponent(page.params.user)]
		]);

		const { articles, articlesCount } = await api.get(`articles?${q}`);

		return {
			props: { articles, articlesCount }
		};
	};
}
