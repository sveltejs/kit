<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, fetch }) {
		const privateParam = url.searchParams.get('private');
		let privateCache = undefined;
		if (privateParam) {
			privateCache = privateParam === 'true' ? true : false;
		}

		const res = await fetch('/caching/private/uses-fetch.json', {
			credentials: /** @type {RequestCredentials} */ (url.searchParams.get('credentials'))
		});

		return {
			cache: {
				maxage: 30,
				private: privateCache
			},
			props: await res.json()
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>
