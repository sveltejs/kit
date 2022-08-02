/** @type {import('@sveltejs/kit').Load} */
export async function load({ url, session, setHeaders }) {
	setHeaders(
		`cache-control: ${
			url.searchParams.has('private') && url.searchParams.get('private') === 'true'
				? 'private'
				: 'public'
		}, max-age=30`
	);
	const session_exists = !!session;

	return {
		session_exists
	};
}
