/** @type {import('./$types').PageLoad} */
export function load({ url, params }) {
	return {
		path: url.pathname,
		slug: params.slug
	};
}
