import { fetchBanner } from '@sveltejs/site-kit/components';

export const prerender = true;

export const load = async ({ url, fetch }) => {
	const nav_links = fetch('/nav.json').then((r) => r.json());
	const banner = fetchBanner('kit.svelte.dev', fetch);

	return {
		nav_title: get_nav_title(url),
		nav_links: await nav_links,
		banner: await banner
	};
};

/** @param {URL} url */
function get_nav_title(url) {
	const list = new Map([[/^docs/, 'Docs']]);

	for (const [regex, title] of list) {
		if (regex.test(url.pathname.replace(/^\/(.+)/, '$1'))) {
			return title;
		}
	}

	return '';
}
