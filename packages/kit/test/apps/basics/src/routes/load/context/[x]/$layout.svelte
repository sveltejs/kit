<script context="module">
	export async function load({ page, context }) {
		return {
			context: {
				message: `${context.message} + new`,
				x: page.params.x
			}
		};
	}
</script>

<slot></slot>