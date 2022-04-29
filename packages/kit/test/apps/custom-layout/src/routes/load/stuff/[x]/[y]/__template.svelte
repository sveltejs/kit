<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params }) {
		return {
			stuff: {
				y: params.y
			}
		};
	}
</script>

<slot />
