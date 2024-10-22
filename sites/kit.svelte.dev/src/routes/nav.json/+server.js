import { get_docs_list } from '$lib/server/docs/index.js';
import { json } from '@sveltejs/kit';

export const prerender = true;

export const GET = async () => {
	const docs_list = get_docs_list();

	/** @type {import('@sveltejs/site-kit').NavigationLink[]} */
	const nav_list = [
		{
			title: 'Docs',
			prefix: 'docs',
			pathname: '/docs/introduction',
			sections: [
				{
					title: 'DOCS',
					sections: docs_list.map(({ title, pages }) => ({
						title,
						sections: pages.map(({ title, path }) => ({ title, path }))
					}))
				}
			]
		}
	];

	return json(nav_list);
};
