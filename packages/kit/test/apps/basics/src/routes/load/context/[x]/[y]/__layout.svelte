<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page }) {
		return {
			context: {
				y: page.params.y
			}
		};
	}
</script>

<slot></slot>
