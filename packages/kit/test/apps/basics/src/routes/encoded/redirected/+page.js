/** @type {import('@sveltejs/kit').Load} */
export function load({ url }) {
	return {
		// nb: .get() on URLSearchParams does a decoding pass, so we should see the raw values.
		embedded: url.searchParams.get('embedded')
	};
}
