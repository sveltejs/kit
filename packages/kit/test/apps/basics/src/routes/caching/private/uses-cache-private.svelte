<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url }) {
		return {
			cache: {
				maxage: 30,
				private: url.searchParams.get('private') === 'true'
			}
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>
