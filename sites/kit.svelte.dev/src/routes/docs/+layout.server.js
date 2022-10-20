import { read_headings, read_headings_on_page } from '$lib/docs/server';

export const prerender = true;

/** @type {import('./$types').LayoutServerLoad} */
export function load({ url }) {
	const section = url.pathname.split('/').pop();
	return {
		sections: read_headings('docs'),
		page_sections: read_headings_on_page('docs', section)
	};
}
