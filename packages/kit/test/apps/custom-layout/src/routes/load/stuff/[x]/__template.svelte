<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, stuff }) {
		return {
			stuff: {
				message: `${stuff.message} + new`,
				x: params.x
			}
		};
	}
</script>

<slot />
