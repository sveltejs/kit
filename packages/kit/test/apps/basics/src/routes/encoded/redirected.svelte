<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ url }) {
		return {
			props: {
				// nb: .get() on URLSearchParams does a decoding pass, so we should see the raw values.
				embedded: url.searchParams.get('embedded')
			}
		};
	}
</script>
<script>
	/** @type {string} */
	export let embedded;
</script>

<pre>{embedded}</pre>
