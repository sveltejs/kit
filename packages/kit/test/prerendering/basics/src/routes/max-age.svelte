<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load() {
		return {
			cache: { maxage: 300 }
		};
	}
</script>

<h1>This page will be cached for 5 minutes</h1>
