/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, setHeaders }) {
	setHeaders(
		`cache-control: ${
			url.searchParams.has('private') && url.searchParams.get('private') === 'true'
				? 'private'
				: 'public'
		}, max-age=30`
	);
}
