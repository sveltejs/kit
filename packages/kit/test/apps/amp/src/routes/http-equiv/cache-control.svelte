<script context="module">
	export const prerender = true;

	/** @type {import('./__types/cache-control').Load} */
	export function load() {
		return {
			cache: {
				maxage: 300
			}
		};
	}
</script>

<h1>the cache-control headers should be removed from this page</h1>
