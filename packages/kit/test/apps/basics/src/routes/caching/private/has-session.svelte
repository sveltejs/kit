<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url }) {
		return {
			cache: {
				maxage: 30,
				private: url.searchParams.has('private')
					? url.searchParams.get('private') === 'true'
					: undefined
			}
		};
	}
</script>

<h1>this page will be private even if $session is not used, but a session is return from hooks.js#getSession</h1>
