<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load() {
		return {
			cache: { maxage: 30 }
		};
	}
</script>

<h1>this page will be cached for 30 seconds</h1>
