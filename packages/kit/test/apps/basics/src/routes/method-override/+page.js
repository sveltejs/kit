/** @type {import('@sveltejs/kit').Load} */
export async function load({ url }) {
	return {
		method: url.searchParams.get('method') || ''
	};
}
