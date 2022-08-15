/** @type {import('@sveltejs/kit').Load} */
export function load({ url }) {
	return {
		path: url.pathname
	};
}
