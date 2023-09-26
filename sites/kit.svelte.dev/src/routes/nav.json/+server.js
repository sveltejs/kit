import { get_docs_data, get_docs_list } from '$lib/server/docs/index.js';
import { json } from '@sveltejs/kit';

export const prerender = true;

export const GET = async () => {
	return json(await get_nav_list());
};

/**
 * @returns {Promise<import('@sveltejs/site-kit').NavigationLink[]>}
 */
async function get_nav_list() {
	const docs_list = get_docs_list(await get_docs_data());
	const processed_docs_list = docs_list.map(({ title, pages }) => ({
		title,
		sections: pages.map(({ title, path }) => ({ title, path }))
	}));

	return [
		{
			title: 'Docs',
			prefix: 'docs',
			pathname: '/docs/introduction',
			sections: [
				{
					title: 'DOCS',
					sections: processed_docs_list
				}
			]
		}
	];
}
