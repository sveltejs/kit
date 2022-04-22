<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url, session }) {
		const privateParam = url.searchParams.get('private');
		let privateCache = undefined;
		if (privateParam) {
			privateCache = privateParam === 'true' ? true : false;
		}
		const session_exists = !!session;

		return {
			props: {
				session_exists
			},
			cache: {
				maxage: 30,
				private: privateCache
			}
		};
	}
</script>

<script>
	export let session_exists;
</script>

<h1>this page will be cached for 30 seconds ({session_exists})</h1>
