<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ session }) {
		const session_exists = !!session;

		return {
			props: {
				session_exists
			},
			maxage: 30
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>
