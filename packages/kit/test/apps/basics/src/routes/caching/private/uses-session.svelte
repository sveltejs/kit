<script context="module">
	export async function load({ session }) {
		const session_exists = !!session;

		return {
			maxage: 30
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>