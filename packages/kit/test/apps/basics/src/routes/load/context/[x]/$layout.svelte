<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
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
