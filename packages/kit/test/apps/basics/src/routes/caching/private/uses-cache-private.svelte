<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url }) {
		const cachePrivate = url.searchParams.get('private') === 'true' ? true : false;

		return {
			cache: {
				maxage: 30,
				private: cachePrivate
			}
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>
