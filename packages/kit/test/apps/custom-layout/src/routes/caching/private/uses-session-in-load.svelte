<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, session }) {
		const session_exists = !!session;

		return {
			props: {
				session_exists
			},
			cache: {
				maxage: 30,
				private: url.searchParams.has('private')
					? url.searchParams.get('private') === 'true'
					: undefined
			}
		};
	}
</script>

<script>
	export let session_exists;
</script>

<h1>this page will be cached for 30 seconds ({session_exists})</h1>
