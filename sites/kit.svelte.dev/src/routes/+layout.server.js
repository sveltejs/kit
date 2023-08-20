export const prerender = true;

export const load = async ({ url, fetch }) => {
	const nav_list = await fetch('/nav.json').then((r) => r.json());

	return {
		nav_title: get_nav_title(url),
		nav_links: nav_list
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
