/** @type {import('@sveltejs/kit').Load} */
export function load({ url }) {
	const { pathname: path } = url;
	return { path };
}
