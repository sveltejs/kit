/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, setHeaders }) {
	setHeaders(
		`cache-control: ${
			url.searchParams.has('private') && url.searchParams.get('private') === 'true'
				? 'private'
				: 'public'
		}, max-age=30`
	);
	const res = await fetch('/caching/private/uses-fetch.json', {
		credentials: /** @type {RequestCredentials} */ (url.searchParams.get('credentials'))
	});

	return await res.json();
}
