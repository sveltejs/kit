/** @type {import('./$types').Load} */
export function load({ url, params }) {
	return {
		path: url.pathname,
		slug: params.slug
	};
}
