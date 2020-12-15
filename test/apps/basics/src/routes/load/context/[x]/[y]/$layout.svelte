<script context="module">
	export async function load({ page }) {
		return {
			context: {
				y: page.params.y
			}
		};
	}
</script>

<slot></slot>