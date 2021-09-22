<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page }) {
		return {
			stuff: {
				y: page.params.y
			}
		};
	}
</script>

<slot></slot>
